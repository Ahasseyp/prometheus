---
name: implement-step-by-step
description: Implement a spec or tickets as small vertical slices, stopping for explicit user approval after each slice.
disable-model-invocation: true
---

# Implement step by step

Implement the work in the spec or tickets as an ordered sequence of **vertical slices**. Each slice starts only after the user has explicitly approved the one before it.

## 1. Plan the slices

Read the spec/tickets, then propose the full ordered slice list. A slice is one reviewable unit of work that leaves lint and tests green — if you can't summarize a slice in one sentence, split it.

Order the slices for reviewability: the user should be able to see or verify each slice the moment it lands.

**Every slice must be manually verifiable.** Implement what can be seen first — even if it is not hooked up and working yet — then hook it up in a following slice. Never land an infrastructure-only slice (gateway, hook, lib) whose only verification is unit tests when a UI consumer could have come first. Gateways and hooks land in the same slice that wires them into a visible component, so the slice can be exercised in the browser at its gate.

Mark which slices carry a testable **seam** (per `/tdd`) and name the seam. Seams are agreed here, in the plan — not mid-slice.

For UI work with new components, the plan follows this shape:

- **Slice 1 is the wiring slice.** Create the entry component at its final path with its real props interface but a visible stub render (a dashed box showing the component name and received props), and consume it in the real view. This slice reviews placement, naming, and data flow.
- **Later slices implement components top-down.** Entry component first — its children still render as stubs — then down the tree, one component per slice. Every slice is visible when it lands because its parent is already real.

For UI work that changes existing behavior (not new components), the same principle applies: land the visible change first (e.g. the new footer, button, or state rendered from existing data with stub handlers), then land the data layer (gateway, hook) together with the wiring that makes it real. The slice that hooks things up must be the slice where the behavior becomes manually testable end to end.

Present the plan and wait. Adjust and re-present until the user approves. Write no code before the plan is approved.

## 2. Persist the plan

Write the approved plan to `.scratch/<feature>-slices.md` with per-slice status (`pending` / `approved` / `committed`). Update it at every gate — it is the resume point if the session is compacted or restarted.

## 3. Execute the current slice

Work only on the current slice. In seam-carrying slices, run the red → green loop per `/tdd`.

Verify with eslint and vitest on the touched files only (e.g. `pnpm exec eslint <files>` and `pnpm --filter <package> test <files>`). Save the full pre-commit suite (`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`) for the finish step.

## 4. Gate

When the slice verifies:

1. Run the **Standards axis only** of `/code-review` (`.agents/skills/code-review`) against the slice's diff. Skip the Spec axis — spec conformance is reviewed once at the end.
2. Post the gate summary: what the slice did, files touched, verification results, standards findings, and how to see it (which page or component to open).
3. Stop. The user approves (`next` / `continue`) or gives feedback. Feedback loops inside the current slice until the user approves; standards findings are fixed or skipped as the user decides at the gate.
4. On approval, commit the slice to the current branch and mark it `committed` in the scratch file. Then — and only then — start the next slice.

Changes to the remaining plan require the user's explicit sign-off; record plan changes in the scratch file.

## 5. Finish

After the final slice is approved and committed, run the full two-axis `/code-review` over the whole change (fixed point = branch base), then the full pre-commit checks from [CONTRIBUTING.md](../../../CONTRIBUTING.md): `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`.
