
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTadpoleItems, parseTasks, taskKey, tasksAreEquivalent } from "@/lib/tasks";
import { getOrCreateAccount } from "@/lib/account";
import { recordFounderEvents } from "@/lib/founder-analytics";
import { parseLocalContext } from "@/lib/local-context";
import { consumeFrogDailyQuota, frogBurstLimit, frogQuotaKey } from "@/lib/frog-quota";

const MAX_DUMP_LENGTH = 2_000;
const MAX_TASKS = 25;
const DEEP_SWAMP_CAPTURE_VERSION = "assignment-context-v1";
const FROG_MODEL = "gpt-4.1";
const FROG_PROMPT_VERSION = "frog-picker-v2";
const FROG_COMPLETION_MAX_TOKENS = 150;

type FrogChoice = { chosen_task: string; first_step: string };

const vaguePattern = /^(get my life|be more productive|sort myself|adult better|become happy|be better|be happier)\b/i;
const genericStepPattern = /^(?:pick up|unlock) your phone\b|^open your (?:phone|laptop|computer)\b|^open your notes app\b/i;
const bannedStepWords = /\b(?:choose|pick|decide|prepare|start|work on|organize|handle|finish)\b/i;

function normalizeChoice(choice: FrogChoice, taskLines: string[]) {
  const exactTask = taskLines.find((task) => taskKey(task) === taskKey(choice.chosen_task));
  const chosenTask = exactTask
    ?? taskLines.find((task) => tasksAreEquivalent(task, choice.chosen_task))
    ?? taskLines[0];
  const firstStep = typeof choice.first_step === "string" ? choice.first_step.trim() : "";
  const validStep = Boolean(firstStep)
    && firstStep.length <= 180
    && !genericStepPattern.test(firstStep)
    && !bannedStepWords.test(firstStep)
    && !/\band\b/i.test(firstStep);

  return { chosenTask, firstStep, validStep };
}

const frogChoiceSchema = {
  type: "json_schema" as const,
  json_schema: {
    name: "frog_choice",
    strict: true,
    schema: {
      type: "object",
      properties: {
        chosen_task: { type: "string" },
        first_step: { type: "string" },
      },
      required: ["chosen_task", "first_step"],
      additionalProperties: false,
    },
  },
};

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });

    const account = await getOrCreateAccount(userId);
    const supabase = getSupabaseAdmin();
    const [activeFrog, pendingFrogs, rememberedFrogs] = await Promise.all([
      supabase
        .from("frogs")
        .select("id, task_dump, frog, chosen_task, chosen_task_position, created_at")
        .eq("account_id", account.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("frogs")
        .select("id", { count: "exact", head: true })
        .eq("account_id", account.id)
        .eq("status", "not_completed"),
      supabase
        .from("frogs")
        .select("id", { count: "exact", head: true })
        .eq("account_id", account.id)
        .in("status", ["completed", "not_completed"]),
    ]);

    if (activeFrog.error) throw activeFrog.error;
    if (pendingFrogs.error) throw pendingFrogs.error;
    if (rememberedFrogs.error) throw rememberedFrogs.error;
    return Response.json({
      frog: activeFrog.data,
      pending_count: pendingFrogs.count ?? 0,
      has_memory: (rememberedFrogs.count ?? 0) > 0,
    });
  } catch (error) {
    console.error("active frog lookup failed", error);
    return Response.json(
      { error: "The swamp could not find your resting frog. Please try again." },
      { status: 503 },
    );
  }
}

async function chooseFrog(req: Request) {
  const { userId } = await auth();
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = req.headers.get("user-agent")?.slice(0, 240);
  const visitorKey = userId ?? `guest:${forwardedFor || "unknown"}`;
  const quotaScope = userId ? "signed_in" : "guest";
  const rateLimit = checkRateLimit(`frog:${visitorKey}`, frogBurstLimit(quotaScope), 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    const message = userId
      ? "The swamp needs a moment. Try again soon."
      : "enjoying the swamp? create an account to keep your frogs, tadpoles, and memory.";

    return Response.json(
      { error: message, code: userId ? "frog_burst_limited" : "guest_quota_reached" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
    );
  }

  const body = await req.json();
  const tasks = body?.tasks;
  const requestedContext = parseLocalContext(body?.context);

  if (typeof tasks !== "string" || tasks.trim() === "") {
    return Response.json({ error: "Add at least one task first." }, { status: 400 });
  }

  if (tasks.length > MAX_DUMP_LENGTH) {
    return Response.json(
      { error: `Keep your task dump under ${MAX_DUMP_LENGTH.toLocaleString()} characters.` },
      { status: 400 },
    );
  }

  const taskLines = parseTasks(tasks);

  if (taskLines.length === 0) {
    return Response.json({ error: "Add at least one task first." }, { status: 400 });
  }

  if (taskLines.length > MAX_TASKS) {
    return Response.json(
      { error: `Keep this swamp to ${MAX_TASKS} tasks or fewer.` },
      { status: 400 },
    );
  }

  const submittedKeys = taskLines.map(taskKey).filter(Boolean);
  if (new Set(submittedKeys).size !== submittedKeys.length) {
    return Response.json(
      { error: "That task is already in this water. Keep one copy and try again." },
      { status: 409 },
    );
  }

  const account = userId ? await getOrCreateAccount(userId) : null;
  const supabase = userId ? getSupabaseAdmin() : null;
  if (account && supabase) {
    const [unresolvedFrogs, activeTadpoles] = await Promise.all([
      supabase
        .from("frogs")
        .select("chosen_task, frog")
        .eq("account_id", account.id)
        .in("status", ["active", "not_completed"]),
      supabase
        .from("tadpoles")
        .select("task_key")
        .eq("account_id", account.id)
        .eq("status", "active"),
    ]);

    if (unresolvedFrogs.error) throw unresolvedFrogs.error;
    if (activeTadpoles.error) throw activeTadpoles.error;

    const unresolvedKeys = new Set<string>();
    for (const frog of unresolvedFrogs.data ?? []) {
      unresolvedKeys.add(taskKey(frog.chosen_task || frog.frog));
    }
    for (const tadpole of activeTadpoles.data ?? []) unresolvedKeys.add(tadpole.task_key);

    if (submittedKeys.some((key) => unresolvedKeys.has(key))) {
      return Response.json(
        { error: "That task is already in the swamp. Clear or finish it before adding it again." },
        { status: 409 },
      );
    }
  }

  const quota = await consumeFrogDailyQuota({
    scope: quotaScope,
    keyHash: frogQuotaKey({ userId, ip: forwardedFor, userAgent }),
    accountId: account?.id ?? null,
  });

  const quotaHeaders = {
    "X-Frog-Daily-Limit": String(quota.limit),
    "X-Frog-Daily-Remaining": String(quota.remaining),
  };

  if (!quota.allowed) {
    const message = userId
      ? "The swamp has surfaced enough frogs today. Come back tomorrow."
      : "enjoying the swamp? create an account to keep your frogs, tadpoles, and memory.";

    return Response.json(
      {
        error: message,
        code: userId ? "frog_daily_quota_reached" : "guest_quota_reached",
        quota: { limit: quota.limit, remaining: 0 },
      },
      {
        status: 429,
        headers: {
          ...quotaHeaders,
          "Retry-After": String(quota.retryAfter),
        },
      },
    );
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 10_000,
    maxRetries: 1,
  });

const isVague = taskLines.length > 0 && taskLines.every((t: string) => 
  vaguePattern.test(t.trim())
);

let chosenTask = "";
let firstStep = "";
let generationSource: "openai" | "deterministic" = "deterministic";
let generationPromptVersion = "vague-fallback-v1";
let generationModel: string | null = null;
let generationSystemFingerprint: string | null = null;
let generationResponseId: string | null = null;
let generationRepaired = false;

if (isVague) {
  chosenTask = taskLines[0]?.trim() || "your task";
  firstStep = "open your notes app and type whatever is sitting heaviest right now";
} else {

const tasksToSend = taskLines.join("\n");

  const systemPrompt = `

You are mySwamp: an intelligent prioritisation engine (“the frog picker”).

Your job is to select ONE single task from the user’s list — the task that will most reduce pressure, avoidance, or negative consequences if completed next.

You are not a productivity coach. You are a decision system.

The user will dump tasks.

Your job is NOT to solve the whole task.
Your job is to choose the smallest visible physical next action.

CORE OBJECTIVE

Choose the task that:
- reduces the most real-world consequence
- breaks the strongest avoidance loop
- creates the most forward momentum or relief

DECISION FRAMEWORK (use internally)

For each task, evaluate:

1. Consequence
- deadlines (especially within 48 hours)
- real-world impact (school, money, commitments)

2. Avoidance signals
- “been avoiding”
- “haven’t started”
- “keep meaning to”
- emotional resistance

3. Pressure type
- immediate (deadline tomorrow)
- accumulating (unfinished work)
- looping (people waiting, unresolved threads)

4. Completion shape
- does it end cleanly?
- prefer tasks that can be completed or meaningfully progressed in 20–45 minutes

---

BOTTLENECK DETECTION (CRITICAL)

Before choosing a task, identify if one of these is limiting everything else:

1. Physical bottleneck
- signals: hunger, exhaustion, illness, inability to function
- effect: all tasks feel harder and more avoidable

IMPORTANT:
A physical bottleneck should only win if there is clear evidence that the user is not functioning properly.

Do NOT prioritise light reset tasks (e.g. showering, “getting ready”) unless the list shows the user cannot meaningfully start anything else.

---

2. Deadline bottleneck
- signals: due very soon (<48h)
- effect: immediate real-world consequences

---

3. Loop bottleneck (open threads)
- signals: people waiting, repeated mentions, unresolved contact
- effect: persistent mental background load

---

4. Start bottleneck
- signals: vague tasks, not started, avoidance patterns
- effect: inertia and no progress

---

BOTTLENECK PRIORITY ORDER

1. Physical (only if clearly impairing function)
2. Immediate deadline
3. Loop (if active and unresolved)
4. Start (default)

MOMENTUM MODE
If all tasks are low-stakes:

→ choose something:
- concrete
- completable
- visibly progress-making

Do NOT manufacture urgency.


OUTPUT RULES (STRICT):
- Return ONE micro-action only.
- It must take under 2 minutes.
- It must be physically doable right now.
- Do not combine actions with "and".
- Do not say "prepare", "start", "work on", "organize", "handle", or "finish".
- Make it smaller than feels reasonable.
- Prefer the first physical object/action involved.
- The action must be recognisably specific to the chosen task.
- Name the obvious app, service, document, screen, person, tool, or object.
- Skip generic gateway actions. Never say "pick up your phone", "unlock your phone", "open your laptop", or "open your notes app" unless the task itself is about notes or a brain dump.
- For ordering food, open a delivery app. For creating a social account, open that platform's create-account screen. For a creative ambition, make the smallest concrete artefact or learning move that advances it.

HARD RULE: The frog MUST NOT contain the words "choose", "pick", 
"decide", or "one specific". 

OUTPUT FORMAT:
Return ONLY valid JSON.

{
  "chosen_task": "exact task from the user's dump",
  "first_step": "one tiny physical action under 2 minutes"
}

Rules:
- chosen_task must be copied from the user's list, not invented.
- first_step must be smaller than the task.
- first_step must not contain "and".
- first_step must not contain "prepare", "start", "work on", "organize", "handle", or "finish".

For vague lists with no concrete tasks, the frog defaults to:
"open your notes app and type whatever is sitting heaviest right now"

That is always a valid frog for a vague list. Use it.

CONSTRAINTS

- Never ask for clarification
- Never request more input
- Always produce an answer
- When all tasks are vague, the frog is ALWAYS exactly this: "open your notes app and type whatever is sitting heaviest right now" Do not generate an alternative. Use this exact output.
- You may rewrite a task into a more concrete first step if it is vague, but you must not change its core intent.

Examples:
User: need to eat dinner
Bad: go to the kitchen and prepare your dinner plate
Good: bring out a plate

User: go to gym
Bad: get ready and go to the gym
Good: put on your gym clothes

User: write essay
Bad: start writing your essay
Good: open the document

User: clean room
Bad: clean your room
Good: pick up one item from the floor

Now choose the frog for this task dump:

${tasksToSend}
`;

  const completion = await client.chat.completions.create({
    model: FROG_MODEL,
    temperature: 0.2,
    max_completion_tokens: FROG_COMPLETION_MAX_TOKENS,
    response_format: frogChoiceSchema,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Tasks:\n${tasksToSend}`,
      },
    ],
  });

  const output = completion.choices[0].message.content?.trim() ?? "";
  generationSource = "openai";
  generationPromptVersion = FROG_PROMPT_VERSION;
  generationModel = completion.model;
  generationSystemFingerprint = completion.system_fingerprint ?? null;
  generationResponseId = completion.id;
  let parsed = JSON.parse(output) as FrogChoice;
  let normalized = normalizeChoice(parsed, taskLines);

  if (!normalized.validStep) {
    const repair = await client.chat.completions.create({
      model: FROG_MODEL,
      temperature: 0,
      max_completion_tokens: FROG_COMPLETION_MAX_TOKENS,
      response_format: frogChoiceSchema,
      messages: [
        {
          role: "system",
          content: `Return JSON for one task-specific physical action under two minutes. The action must directly advance the task. Name the relevant app, screen, document, person, tool, or object. Never use a generic gateway such as picking up or unlocking a phone, opening a laptop, or opening Notes. Do not use "and" or the words choose, pick, decide, prepare, start, work on, organize, handle, or finish.`,
        },
        {
          role: "user",
          content: `Chosen task: ${normalized.chosenTask}\nRejected generic step: ${parsed.first_step}\nReplace it with a specific first step. Keep chosen_task exactly as supplied.`,
        },
      ],
    });
    parsed = JSON.parse(repair.choices[0].message.content ?? "") as FrogChoice;
    generationRepaired = true;
    generationModel = repair.model;
    generationSystemFingerprint = repair.system_fingerprint ?? null;
    generationResponseId = repair.id;
    normalized = normalizeChoice({ ...parsed, chosen_task: normalized.chosenTask }, taskLines);
  }

  chosenTask = normalized.chosenTask;
  firstStep = normalized.validStep ? normalized.firstStep : `open the ${normalized.chosenTask} task where you will do it`;
}

  // Guests can try the frog picker without exposing the OpenAI key or
  // creating orphaned database rows. Signing in adds durable memory.
  if (!userId) {
    await recordFounderEvents([
      { event_name: "task_dumped" },
      { event_name: "frog_generated" },
    ]);
    return Response.json({
      id: null,
      chosen_task: chosenTask,
      first_step: firstStep,
      frog: firstStep,
      guest: true,
      quota: { limit: quota.limit, remaining: quota.remaining },
    }, { headers: quotaHeaders });
  }

  if (!account || !supabase) throw new Error("The signed-in account could not be loaded");
  const chosenTaskPosition = Math.max(
    0,
    taskLines.findIndex((task) => taskKey(task) === taskKey(chosenTask)),
  );
  const tadpoleItems = getTadpoleItems(tasks, chosenTask, firstStep, chosenTaskPosition);
  const { data: savedRows, error: assignmentError } = await supabase.rpc(
    "create_frog_assignment",
    {
      p_payload: {
        user_id: userId,
        account_id: account.id,
        task_dump: tasks.trim(),
        task_count: taskLines.length,
        frog: firstStep,
        chosen_task: chosenTask,
        chosen_task_position: chosenTaskPosition,
        capture_version: DEEP_SWAMP_CAPTURE_VERSION,
        context: requestedContext
          ? {
              timezone: requestedContext.timezone,
              local_hour: requestedContext.localHour,
              local_weekday: requestedContext.localWeekday,
            }
          : null,
        generation: {
          source: generationSource,
          prompt_version: generationPromptVersion,
          model: generationModel,
          system_fingerprint: generationSystemFingerprint,
          response_id: generationResponseId,
          repaired: generationRepaired,
        },
        tadpoles: tadpoleItems.map((item) => ({
          position: item.position,
          task_text: item.taskText,
          task_key: item.taskKey,
        })),
        deep_items: taskLines.map((taskText, position) => ({
          position,
          task_text: taskText,
          is_selected: position === chosenTaskPosition,
        })),
      },
    },
  );

  if (assignmentError) throw assignmentError;
  const savedFrog = savedRows?.[0];
  if (!savedFrog?.id) throw new Error("The frog assignment was not returned");

  await recordFounderEvents([
    { event_name: "task_dumped" },
    { event_name: "frog_generated" },
  ]);

  return Response.json({
    id: savedFrog.id,
    chosen_task: chosenTask,
    first_step: firstStep,
    frog: firstStep,
    quota: { limit: quota.limit, remaining: quota.remaining },
  }, { headers: quotaHeaders });
}

export async function POST(req: Request) {
  try {
    return await chooseFrog(req);
  } catch (error) {
    console.error("frog route failed", error);
    return Response.json(
      { error: "The swamp is a little foggy right now. Your tasks are still safe—please try again." },
      { status: 503 },
    );
  }
}
