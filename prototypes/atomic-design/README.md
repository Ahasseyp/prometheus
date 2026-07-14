# Atomic Design Prototype

This prototype validates the folder structure and component conventions for the Prometheus React frontend.

## Proposed structure

```text
src/
├── components/
│   ├── ui/              # shadcn/ui primitives (installed, not hand-authored)
│   ├── atoms/           # truly shared, single-purpose components: Money, CurrencyBadge, CategoryPill
│   └── molecules/       # shared small composites used by multiple features
├── features/
│   ├── accounts/
│   │   └── components/  # AccountCard, AccountSummary
│   └── transactions/
│       └── components/  # TransactionRow, TransactionList
├── gateways/
│   ├── README.md        # gateway conventions (copied from repo root GATEWAYS_README.md)
│   ├── accounts.ts      # fetchAccounts, accountsOptions, accountKeys
│   └── transactions.ts  # fetchTransactions, transactionsOptions, transactionKeys
├── layouts/             # page shells: MobileLayout
├── pages/               # full screens: DashboardPage
├── lib/
│   ├── react-query.ts   # facade: re-export everything from @tanstack/react-query
│   └── utils.ts         # shared utilities (cn)
└── domain/              # domain types and pure helpers (Money, formatMoney, etc.)
```

## Conventions

1. **One component per folder**
   - `ComponentName/ComponentName.tsx`
   - `ComponentName/index.ts` barrel-exports the public API
   - `ComponentName/ComponentName.test.tsx` for co-located tests
   - `ComponentName/ComponentName.stories.tsx` for Storybook stories (to add later)

2. **shadcn/ui primitives are atoms by convention**
   - Keep them in `components/ui/`
   - Do not edit them after installation; wrap or extend in `atoms/`/`molecules/` when customization is needed

3. **Named exports only**
   - Props interface is named `ComponentNameProps`
   - Ref-wrapped components use `React.forwardRef`

4. **Domain logic lives in `domain/`, not components**
   - Types and pure helpers are imported from `~/domain/money` etc.
   - Components stay presentational

5. **Features own UI; components stay pure**
   - Each feature exposes components that receive data via props and emit events via callbacks
   - No data fetching inside feature components

6. **Data fetching lives in `gateways/` via the React Query facade**
   - Import React Query only from `~/lib/react-query`, never from `@tanstack/react-query` directly
   - Each gateway file exports `fetch*` functions, `<entity>Keys`, and `*Options()` functions
   - Use `queryOptions()` as the primary abstraction; compose at the call site with `useQuery`, `useSuspenseQuery`, etc.
   - Mock fetchers in prototypes; swap for real API calls in production

7. **Styling rules**
   - Tailwind only; no inline CSS except dynamic values (e.g. category colors)
   - Use `cn()` for conditional classes
   - Mobile-first spacing and typography
   - shadcn CSS variables drive the theme

8. **Impeccable skill workflow**
   - Use `/impeccable` for UX review, polish, and component-level design decisions
   - Run `context.mjs` before each Impeccable session
   - Treat `components/ui/` as read-only; apply design-system changes by updating tokens or wrapping primitives

9. **Package manager**
   - Use `pnpm` for all frontend work in this repo

10. **Essential skills**
    - `/readable-code` — apply to every component and helper
    - `/react-component-composition` — use for complex UI elements (modals, composers, multi-step forms, etc.), not every small component

## Running the prototype

```bash
cd prototypes/atomic-design
pnpm install
pnpm dev
```

## Example page

`src/App.tsx` renders `DashboardPage`, which uses:

- `useQuery(accountsOptions())` and `useQuery(transactionsOptions())` from `~/gateways` for data
- `AccountSummary` and `TransactionList` from `~/features` for UI
- `MobileLayout` for the page shell
- Atoms like `Money`, `CurrencyBadge`, and `CategoryPill` inside feature components

## Open questions this prototype surfaces

- **Shared molecules:** live in `components/molecules/` (or `components/common/` if we drop the atomic-design label). Move a component there only once a second feature actually needs it; don't pre-extract.
- **Cross-cutting concerns:** generic overlay shells (Dialog, Sheet, Toast) live in `components/molecules/` or `components/providers/`; feature-specific content lives in the relevant `features/<name>/`. The AI composer is a core feature and belongs in `features/assistant/` (or `features/ai-composer/`), likely using `/react-component-composition`.
- **Storybook stories:** co-located as `ComponentName.stories.tsx` next to the component.
