---
name: implement-step-by-step
description: Implement an approved vertical-slice plan, stopping for explicit user approval after each slice.
disable-model-invocation: true
---

# Implement step by step

Implement an approved `.scratch/<feature>-slices.md` plan as an ordered sequence of **vertical slices**. Each slice starts only after the user has explicitly approved the one before it. To create or revise a plan before implementation, use `/plan-slices`.

## 1. Load the handoff

Require the path to an approved slice plan. If none was provided, ask for it.

Read the plan and treat it as the complete implementation brief. Do not replan approved work or ask for context already captured there. Read the files, symbols, docs, and ADRs cited in **Requirements and context** to confirm the integration points; use those findings to avoid repeating the planning agent's broad investigation.

Resume from the status table:

- `committed` slices are complete.
- For an `approved` but uncommitted slice, commit it and mark it `committed` before continuing.
- Work on the first `pending` slice. If none remains, proceed to the finish step.

## 2. Execute the current slice

Work only on the current slice. In seam-carrying slices, run the red → green loop per `/tdd` at the seam named in the plan.

Verify with eslint and vitest on the touched files only (e.g. `pnpm exec eslint <files>` and `pnpm --filter <package> test <files>`). Save the full pre-commit suite (`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`) for the finish step.

## 3. Gate

When the slice verifies:

1. Run the **Standards axis only** of `/code-review` (`.agents/skills/code-review`) against the slice's diff. Skip the Spec axis — spec conformance is reviewed once at the end.
2. Post the gate summary: what the slice did, files touched, verification results, standards findings, and how to see it (which page or component to open).
3. Stop. The user approves (`next` / `continue`) or gives feedback. Feedback loops inside the current slice until the user approves; standards findings are fixed or skipped as the user decides at the gate.
4. On approval, commit the slice to the current branch and mark it `committed` in the scratch file. Then — and only then — start the next slice.

Update the status table at every gate — it is the resume point if the session is compacted, restarted, or delegated.

Changes to the remaining plan require the user's explicit sign-off; record them in the plan change log. If the implementation discovers that the plan is stale or based on an incorrect assumption, stop and resolve the discrepancy with the user rather than silently changing the approved approach.

## 4. Finish

After the final slice is approved and committed, run the full two-axis `/code-review` over the whole change (fixed point = branch base), then the full pre-commit checks from [CONTRIBUTING.md](../../../CONTRIBUTING.md): `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`.
