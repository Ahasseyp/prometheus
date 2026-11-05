# Example slice plan

This is an illustrative `.scratch/<feature>-slices.md` for a Prometheus feature,
shown mid-flight so the status mechanics are visible. Annotations in blockquotes
explain why each section exists — do not copy them into real plans.

---

# #123 — Transaction filters — slice plan

Issue: https://github.com/<owner>/prometheus/issues/123
Branch: `feat/issue-123/transaction-filters`
Base: `main`

> **Why:** the header orients a fresh or compacted session in one glance — which
> issue, branch, and feature.

## Scope

Add account, category, and transaction-type filters to the existing Transactions
page, with the selected filters reflected in the list and empty state.

**Out of scope:** date-range filters, saved filter presets, and changes to
transaction creation or editing.

> **Why:** a few bullets bound the work and stop scope creep at the gate without
> restating the whole issue.

## Requirements and context

### Required behavior

- Applying any combination of account, category, and transaction-type filters
  updates the displayed list. Clearing all filters restores the unfiltered list.
- Show a filter-specific empty state with a clear-filters action when no
  transactions match. Existing transaction creation and editing remain unchanged.

### Read first

- `TransactionsManager.tsx` — owns the Transactions page, list state, and the
  integration point for the new filter trigger and panel.
- The existing transactions tRPC input, query, and API filtering path — the
  server-side boundary to extend.
- `docs/frontend-form-dialog-pattern.md` — the required Dialog/Sheet pattern.

### Existing flow and reuse

- The page obtains transactions plus Household account and category options
  through current tRPC queries; reuse them rather than adding parallel state.
- Reuse the existing responsive Dialog/Sheet behavior for the filter panel.

### Constraints and pitfalls

- The existing list is paginated, so filtering only the loaded browser page
  would produce incomplete results.
- Keep the existing empty state when no filters are active; use the new
  filter-specific empty state only after filters are applied.

### Verification setup

- Manually verify on the Transactions page at desktop and narrow widths.
- Run focused vitest coverage for the transactions query and filtering seam.

> **Why:** preserve the planning agent's discoveries so the implementing agent
> can make targeted confirmation reads instead of repeating broad investigation.

## Decisions

- Filters apply through the existing transactions tRPC query rather than
  filtering only the currently loaded page in the browser.
- Follow `docs/frontend-form-dialog-pattern.md` for any new form controls and
  keep the mobile filter UI in a Sheet.

> **Why:** record only decisions that change implementation. Omit this section
> when there are none.

## For the implementing agent

Invoke `/implement-step-by-step` with this file's path. Treat this plan as the
complete implementation brief, resume from the status table at slice 4, and do
not replan approved work.

> **Why:** the plan supplies the feature and investigation context, while the
> implementation skill supplies the execution protocol without duplication.

## Slices

| #   | Slice                                      | Status      |
| --- | ------------------------------------------ | ----------- |
| 1   | Filter trigger and panel wiring            | `committed` |
| 2   | Filter panel layout scaffold               | `committed` |
| 3   | Account, Category, and Type controls       | `committed` |
| 4   | Filtered transactions query and empty state | `pending`   |

> **Why:** the status table is the resume point. Statuses are `pending` /
> `approved` / `committed`; update it at every gate.

### 1. Filter trigger and panel wiring — `committed`

Add a visible filter trigger to Transactions and open a stubbed filter panel.

- `TransactionsManager.tsx`: add the trigger and open/close state
- New `TransactionFiltersPanel` at its final path with its real props and a
  visible dashed stub render
- Reuse the existing responsive Dialog/Sheet pattern
- Verify: the trigger opens the labeled stub on desktop and mobile

### 2. Filter panel layout scaffold — `committed`

Establish the filter panel's regions and responsive behavior.

- Render labeled Account, Category, Type, footer, and clear-all regions through
  a local throwaway `Stub` helper
- Keep the footer pinned while the controls region scrolls
- Verify: all regions are visible at desktop and narrow widths; long stub
  content scrolls without moving the footer

### 3. Account, Category, and Type controls — `committed`

Replace the control stubs with real controls backed by existing options.

- Account and Category selectors use current Household data
- Type selector offers income, expense, and transfer
- Clear-all resets local selections; Apply still uses a stub handler
- Verify: controls can be changed and reset, with selections visible in the panel

### 4. Filtered transactions query and empty state — `pending`

Apply selections to the real transactions query and render the filtered result.

- Extend the transactions tRPC input and API filtering for account, category,
  and transaction type
- Wire Apply to the existing query and show active-filter count on the trigger
- Use a filter-specific empty state with a clear-filters action
- Seam: transactions query input and filtering behavior
- Verify: applying each filter changes the displayed Transactions and empty
  state; clearing filters restores the unfiltered list

> **Why this shape:** every slice is one reviewable unit with a one-line goal, a
> few bullets of changes, and a `Verify:` line. `Seam:` appears only where a
> testable seam exists (per `/tdd`). The visible wiring and layout land before
> the data layer, and the query lands with the UI wiring that makes it manually
> testable end to end.

## Plan change log

- 2026-10-27: initial plan (4 slices) written and approved as-is
- 2026-10-27: date-range filters moved out of scope; approved by user at gate

> **Why:** plan changes after approval need explicit sign-off. The change log
> preserves the approved evolution of the implementation handoff.
