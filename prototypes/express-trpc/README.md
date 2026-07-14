# Express + tRPC + Zod + Prisma prototype

A throwaway vertical slice for the Prometheus backend.

## What it proves

- Express as the HTTP server.
- tRPC for end-to-end typed RPC.
- Zod for input validation.
- Prisma for persistence.
- Vitest for unit + integration tests against a real SQLite database.

## Run it

```bash
cd prototypes/express-trpc
pnpm install
pnpm db:push
pnpm dev
```

The server starts on `http://localhost:3001`.

## Test it

```bash
pnpm test
```

## Files

- `src/server.ts` — Express app + tRPC middleware.
- `src/trpc.ts` — tRPC init + context with Prisma.
- `src/router.ts` — tRPC router with `transaction.create`.
- `src/__tests__/unit.test.ts` — Zod schema unit tests.
- `src/__tests__/integration.test.ts` — End-to-end `transaction.create` test.
