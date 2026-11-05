---
name: plan-slices
description: Plan a spec or tickets as small, manually verifiable vertical slices and produce an approved, self-contained implementation handoff.
disable-model-invocation: true
---

# Plan slices

Turn the spec or tickets into an ordered sequence of **vertical slices** and an approved implementation handoff. Do not write implementation code.

## 1. Investigate and plan the slices

Read the spec/tickets and investigate the relevant code, docs, and ADRs. Preserve findings that would otherwise need to be rediscovered by the implementing agent: important files and symbols, existing data flow, reusable interfaces, constraints, pitfalls, and verification setup.

Propose the full ordered slice list. A slice is one reviewable unit of work that leaves lint and tests green — if you can't summarize a slice in one sentence, split it.

Order the slices for reviewability: the user should be able to see or verify each slice the moment it lands.

**Every slice must be manually verifiable.** Implement what can be seen first — even if it is not hooked up and working yet — then hook it up in a following slice. Never land an infrastructure-only slice (gateway, hook, lib) whose only verification is unit tests when a UI consumer could have come first. Gateways and hooks land in the same slice that wires them into a visible component, so the slice can be exercised in the browser at its gate.

Mark which slices carry a testable **seam** (per `/tdd`) and name the seam. Seams are agreed here, in the plan — not mid-slice.

For UI work with new components, the plan follows this shape:

- **Slice 1 is the wiring slice.** Create the entry component at its final path with its real props interface but a visible stub render (a dashed box showing the component name and received props), and consume it in the real view. This slice reviews placement, naming, and data flow.
- **Slice 2 is the layout scaffold** (multi-region UIs only — skip it when the feature is a single region). Replace the entry component's single stub with the real layout frame: panes, scroll containers, pinned regions, responsive visibility. Render each region as a labeled stub via a local throwaway `Stub` helper in the entry component file — dashed border, muted label showing the future component's name, `className` passthrough for placement. This slice reviews the layout contract (what scrolls, what stays pinned, what collapses and when) in the browser before any real component exists.
- **Later slices implement components top-down.** Replace the scaffold's stubs one component per slice, down the tree. Every slice is visible when it lands because its surrounding frame is already real.

For UI work that changes existing behavior (not new components), the same principle applies: land the visible change first (e.g. the new footer, button, or state rendered from existing data with stub handlers), then land the data layer (gateway, hook) together with the wiring that makes it real. The slice that hooks things up must be the slice where the behavior becomes manually testable end to end.

Once the initial decisions are settled, do not present the plan in chat for approval — persist it immediately and let the user review the written file.

## 2. Persist the plan, then review

Write the plan to `.scratch/<feature>-slices.md`, following [EXAMPLE.md](./EXAMPLE.md). Ask the user whether anything should be modified. Adjust and rewrite the file until the user approves it — the scratch file, not a chat message, is the plan under review at all times.

The plan is the sole handoff artifact. A fresh agent given its path and `/implement-step-by-step` must be able to implement the approved work without access to the original conversation. Capture every requirement, constraint, and investigation finding needed for implementation; linked tickets and specs are references, not substitutes for that brief. Use targeted paths and concise explanations rather than transcripts or large code excerpts.

The plan format:

- **Header** — GitHub issue/spec links, branch and base, one-line feature summary.
- **Scope** — a few bullets bounding the work (in/out).
- **Requirements and context** — required behavior, existing behavior and data flow, concrete files and symbols to read first, reusable interfaces, implementation constraints, pitfalls, and verification setup.
- **Decisions** — optional; only decisions that change implementation. Include rejected alternatives when they prevent the implementing agent from revisiting a settled choice. Omit the section when there are none.
- **For the implementing agent** — invoke `/implement-step-by-step` with this plan's path; treat the plan as the complete brief and resume from its status table without replanning.
- **Status table** — every slice with its one-line goal and status (`pending` / `approved` / `committed`); each slice heading also carries its status. All slices start as `pending`.
- **Slices** — one-line goal, a few bullets of what changes, a `Verify:` line (how to see it), `Seam:` only when a seam exists.
- **Plan change log** — dated, user-signed-off changes to the plan.

## 3. Route the approved plan

Once the user approves the plan, ask whether you should implement it yourself or delegate it to another agent. Do not start implementation until the user chooses:

- **Implement:** invoke `/implement-step-by-step` with the plan path.
- **Delegate:** give the new agent the plan path and direct it to use `/implement-step-by-step`. Do not duplicate the brief in the delegation prompt or implement the work yourself.

Either route enters the same implementation skill and preserves the same per-slice user gates.
