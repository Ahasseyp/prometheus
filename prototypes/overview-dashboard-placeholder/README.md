# Overview dashboard placeholder snapshot

This directory contains an exact snapshot of the Overview page placeholder that was living in the main web app.

## Purpose

The current `/` route uses mock data for accounts, transactions, budgets, and goals, but the layout, card structure, typography, and visual treatment are the target design. This snapshot preserves that design so it can be replicated once the underlying CRUD features are built.

## File

- `OverviewPage.tsx` — the original page component, copied as-is.

## What it depends on

The component is not runnable on its own. It relies on the main app's shared pieces:

- UI components: `Button`, `Card`, `CardAction`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`.
- Auth hook: `useAuthHouseholdState` (for the household name).
- Utilities: `cn` for conditional class names.
- Design tokens: `--gradient-card`, `--shadow-*`, `glow-internal`, and the color system from `apps/web/src/index.css`.

## Mock data it represents

- `MOCK_ACCOUNTS` — id, name, balance, type (`checking` | `savings` | `credit`).
- `MOCK_TRANSACTIONS` — id, name, date, amount, category.
- `MOCK_BUDGETS` — id, name, spent, limit.
- `MOCK_GOALS` — hardcoded emergency fund and vacation goals.
- Static monthly change of `324.81` and USD formatting.

## Future work

The real-data rebuild is tracked by the GitHub issues created from `/to-tickets`:

1. Accounts summary on Overview
2. Recent transactions and monthly change on Overview
3. Budget progress on Overview
4. Goals progress on Overview
5. Overview loading and empty states
