# Walkthrough presentation example

The canonical model of how to present each issue during the step 6 walkthrough. Follow this format every time.

## The presentation block

Each issue is presented as:

- **Heading** — `Issue N of M · <Axis> · <Finding Name>`
- **Labeled fields** — `File:` (path with line range), `Finding:`, `Why it matters:` (one-sentence diagnosis)
- **Quoted hunk** — a short fenced snippet of the offending code beneath the Finding (soft cap ~10 lines)
- **Rule/spec quote** — a blockquote of the violated rule or spec line, with source attribution
- **Options** — 2–4 concrete actions, each with a one-line trade-off; the recommended option marked "(Recommended)" with a why; explicit "Skip this issue" and "Stop the walkthrough" choices

**The options MUST be presented via the interactive question mechanism (multiple-choice buttons) — never as plain text expecting a typed reply.**

Keep the whole block scannable in seconds: one-sentence diagnosis, ~10-line hunk cap, no preamble.

## Example: Standards finding

### Issue 2 of 5 · Standards · Primitive Obsession

**File:** `src/billing/invoice.ts:34-41`

**Finding:** The invoice total is passed around as a raw `number` in cents, with the currency carried separately as a string.

```ts
function formatInvoice(totalCents: number, currency: string) {
  return `${(totalCents / 100).toFixed(2)} ${currency}`;
}
```

> **Primitive Obsession** — a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
>
> — Smell baseline, SKILL.md step 3

**Why it matters:** Nothing stops a caller from mixing currencies or passing dollars where cents are expected; a small `Money` type makes the bug unrepresentable.

**Present the options below via the interactive question mechanism — never as plain text expecting a typed reply.**

- **Introduce a `Money` value type** (Recommended) — one small file; call sites become self-validating. Preferred because it fixes the smell at the root rather than at each call site.
- **Keep primitives, add a validation helper** — smaller diff, but the invariant stays convention-only.
- **Skip this issue**
- **Stop the walkthrough**

## Example: Spec finding

### Issue 4 of 5 · Spec · Missing retry limit

**File:** `src/jobs/sync.ts:58-70`

**Finding:** The sync job retries failed requests indefinitely; the spec requires a maximum of three attempts.

```ts
while (true) {
  try {
    await push(batch);
    break;
  } catch {
    await backoff();
  }
}
```

> "Failed sync requests are retried at most 3 times before the job is marked failed."
>
> — Spec, "Error handling" section

**Why it matters:** An unbounded retry loop can stall the queue forever on a permanently failing endpoint.

**Present the options below via the interactive question mechanism — never as plain text expecting a typed reply.**

- **Cap retries at 3, then mark the job failed** (Recommended) — matches the spec line exactly; failure surfaces to the user instead of hanging silently.
- **Cap retries at 3, then log and skip the batch** — keeps the job alive, but silently drops data the spec says should fail the job.
- **Skip this issue**
- **Stop the walkthrough**

## Scope

These examples cover presenting the issue and offering options only. Fix application, the decision log, and the end-of-walkthrough summary follow the process in SKILL.md and are not modeled here.
