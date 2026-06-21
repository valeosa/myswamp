# Deep Swamp

Deep Swamp is the future personalised pattern layer for mySwamp. Its purpose is to identify the conditions in which a person completes, delays, or returns to different kinds of frogs.

## Current foundation

- Signed-in frog assignments store the raw dump, selected source task, generated first action, assignment time, completion time, and immutable `done` / `not yet` events.
- Tadpoles persist independently of frog status. Individual and bulk clears create immutable events with their source frog and elapsed time; bulk clears remain distinguishable so they are not treated as separate deliberate completions.
- People can explicitly opt into Deep Swamp analysis in preferences.
- Opted-in assignments store each frog and tadpole as a separate task-item snapshot, plus local timezone, hour, weekday, and task count.
- Opting out stops future Deep Swamp capture and deletes the extra task-item and local-time context. Ordinary frog history remains.
- Category, deadline, obligation, and confidence columns exist but are intentionally empty until a versioned classifier is implemented and evaluated.
- Signed-in users can “mark the water” with season, life context, energy, and moment. A mark begins an era and remains the applicable context until the next mark; it is never attached to one specific frog.

## Next collection work

- [ ] Implement and test a versioned task classifier.
- [ ] Label task category: admin, creative, domestic, financial, health, school, social, work, or other.
- [ ] Extract explicit/inferred deadlines with confidence.
- [ ] Detect whether another person is waiting and whether a task is a social obligation.
- [ ] Detect whether a frog or tadpole is primarily physical, separately from its life category.
- [ ] Build an internal data-quality view before showing user-facing insights.
- [ ] Define observation windows for active, stalled, completed, and abandoned frogs.
- [ ] Exclude active (right-censored) frogs from naive completion-time averages.
- [ ] Compare tadpole-clear latency by tadpole category, source-frog category, and clear method.
- [ ] Join each frog to the newest water mark at or before its assignment time, without copying or mutating the frog record.

## Insight rules

Personal claims compare a person with themselves. Example:

`P(not yet | school frog + social tadpole) vs P(not yet | school frog without social tadpole)`

Do not show a personal pattern unless:

- there are at least 30 resolved frogs for the person;
- each side of the comparison has at least 6 observations;
- the difference survives uncertainty/shrinkage checks;
- the copy names the evidence window and remains probabilistic;
- no causal claim is made from correlation alone.

Good: “Across your last 14 creative frogs, you finished faster when admin tadpoles were also present.”

Bad: “Admin tasks make you creative.”

## Water-context vocabulary

The active vocabulary intentionally excludes catch-all `other` values and overlapping labels such as `outreach` and `transition`; marks should remain interpretable enough to support real comparisons.

- `scattered` energy: attention is fragmented across several directions.
- `unstable` energy: emotional or functional capacity is shifting unpredictably.
- `before something big`: an upcoming change feels clear and emotionally heightened, such as excitement, nerves, or bracing.
- `liminal`: the next path is visible, but the person has not arrived in it yet and is moving through the in-between.
- `unstable` moment: the surrounding period itself lacks steady ground or is changing unpredictably.

## Product sequence

1. Collect consented assignment and outcome data.
2. Validate classifier quality on founder-reviewed samples.
3. Build private/internal pattern queries.
4. Add minimum-evidence and confidence gates.
5. Test insight wording for accuracy and emotional safety.
6. Release Deep Swamp observations gradually.
