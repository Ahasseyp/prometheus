# Coding Standards

## Stack and versions

- **Package manager:** pnpm 9.x with workspaces (`apps/*`, `packages/*`).
- **Runtime:** Node.js 20 LTS or later.
- **Language:** TypeScript 5.x in strict mode, ESM, NodeNext module resolution.
- **Frontend:** Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui.
- **Backend:** Express + tRPC + Zod + Prisma.
- **Testing:** Vitest across the monorepo; React Testing Library + MSW for frontend unit tests.

## Monorepo layout

```
apps/
  api/          # Express + tRPC backend
  web/          # Vite + React frontend
packages/
  domain/       # Pure TypeScript domain helpers; no framework dependencies
```

Package names use the `@prometheus/` scope.

## TypeScript conventions

- Extend the root `tsconfig.json` from each package.
- Use explicit `.js` extensions in ESM imports (`./index.js`, not `./index`).
- Avoid `any`. Prefer `unknown` with narrowing.
- Public package exports must be typed. Internal code can infer when the type is obvious.
- Throw errors only for exceptional states; use result types or explicit `null` for expected failures.

## Code style

- Format with Prettier and enforce with ESLint (`pnpm lint`, `pnpm format:check`).
- Use single quotes, trailing commas where valid, semicolons, and 100-character print width.
- Prefer named exports over default exports for libraries and shared code.

## Domain language

Use the terms defined in [CONTEXT.md](CONTEXT.md):

- **Money** for amounts, not `amount` or `value`.
- **Account** for a financial container, not `wallet`.
- **Transaction** for a movement of Money, not `expense` or `income`.
- **Household** for the group of Users, not `organization` or `family`.
- **Reporting Currency** for the Household default, not `baseCurrency`.

Names in code (variables, types, functions, tables) should reflect these terms.

## Money

- Use [Dinero.js](https://dinerojs.com/) for Money math.
- Never use floating-point arithmetic for money values.
- Currency-aware operations must be explicit; same-currency operations are the default.
- Store per-Transaction Exchange Rates so historical reports reflect the rate at creation time.

## Testing

- Prefer TDD at pre-agreed seams.
- Unit tests live next to the code they test (`feature.test.ts` beside `feature.ts`).
- Backend integration tests use a real tRPC client against the Express app factory.
- Frontend tests mock network calls with MSW.
- A test must fail for a real reason before it passes.

## Imports and dependencies

- Keep `packages/domain` free of framework dependencies (React, Express, Prisma, etc.).
- Apps can import from `@prometheus/domain`; packages must not import from apps.
- Avoid deep relative paths (`../../`) across package boundaries; import from the package name instead.

## Error handling

- Validate external boundaries with Zod.
- Return typed errors from domain operations; let the API layer translate them into HTTP/tRPC responses.
- Do not log or expose secrets, tokens, or Recovery Codes.

## Readability

- Prioritize clarity over cleverness. Boring code that is easy to read is better than compact code that needs explanation.
- One idea per line. Name every intermediate step.
- Isolate compound conditions into named variables or helpers.
- Avoid deep nesting; use early returns and guard clauses.
- Break long method chains into named steps when any step is complex.
- See the [`readable-code` skill](.agents/skills/readable-code/SKILL.md) for the full principles and examples.

## Comments and documentation

- Avoid comments that explain what the code does; prefer clearer names.
- Use comments for **why** a non-obvious decision was made, and reference the issue or ADR.
- Document public package APIs in the README or inline TSDoc when the type alone is not enough.
