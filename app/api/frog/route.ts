
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseTasks } from "@/lib/tasks";
import { getOrCreateAccount } from "@/lib/account";

const MAX_DUMP_LENGTH = 2_000;
const MAX_TASKS = 25;

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });

    const account = await getOrCreateAccount(userId);
    const supabase = getSupabaseAdmin();
    const [activeFrog, pendingFrogs, rememberedFrogs] = await Promise.all([
      supabase
        .from("frogs")
        .select("id, task_dump, frog, chosen_task, created_at")
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
  const visitorKey = userId ?? `guest:${forwardedFor || "unknown"}`;
  const rateLimit = checkRateLimit(`frog:${visitorKey}`, userId ? 10 : 3, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "The swamp needs a moment. Try again soon." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
    );
  }

  const { tasks } = await req.json();

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

  if (taskLines.length > MAX_TASKS) {
    return Response.json(
      { error: `Keep this swamp to ${MAX_TASKS} tasks or fewer.` },
      { status: 400 },
    );
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const vaguePattern = /^(get my life|be more productive|sort myself|adult better|become happy|be better|be happier)/i;
const isVague = taskLines.length > 0 && taskLines.every((t: string) => 
  vaguePattern.test(t.trim())
);

let chosenTask = "";
let firstStep = "";

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
`;;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0.2,
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

  const output = completion.choices[0].message.content?.trim();

let parsed;

try {
  parsed = JSON.parse(output || "");
} catch {
  parsed = {
    chosen_task: taskLines[0] || "your task",
    first_step: output || "touch the first object involved",
  };
}

chosenTask = parsed.chosen_task;
firstStep = parsed.first_step;
}

  // Guests can try the frog picker without exposing the OpenAI key or
  // creating orphaned database rows. Signing in adds durable memory.
  if (!userId) {
    return Response.json({
      id: null,
      chosen_task: chosenTask,
      first_step: firstStep,
      frog: firstStep,
      guest: true,
    });
  }

  const account = await getOrCreateAccount(userId);
  const supabase = getSupabaseAdmin();
  const { data: savedFrog, error: frogError } = await supabase
    .from("frogs")
    .insert({
      user_id: userId,
      account_id: account.id,
      task_dump: tasks.trim(),
      frog: firstStep,
      chosen_task: chosenTask,
      status: "active",
    })
    .select("id")
    .single();

  if (frogError) throw frogError;

  const { error: eventsError } = await supabase.from("frog_events").insert([
    {
      user_id: userId,
      account_id: account.id,
      frog_id: savedFrog.id,
      event_type: "swamp_dumped",
      raw_tasks: tasks.trim(),
    },
    {
      user_id: userId,
      account_id: account.id,
      frog_id: savedFrog.id,
      event_type: "frog_assigned",
      raw_tasks: tasks.trim(),
      frog_text: firstStep,
      action_text: firstStep,
    },
  ]);

  if (eventsError) throw eventsError;

  return Response.json({
    id: savedFrog.id,
    chosen_task: chosenTask,
    first_step: firstStep,
    frog: firstStep,
  });
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
