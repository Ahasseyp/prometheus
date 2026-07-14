# Research: Database and Storage Strategy

**Research ticket:** [#4 Research: Database and storage strategy](https://github.com/Ahasseyp/prometheus/issues/4)  
**Part of map:** [#1 Map: Architecture for AI-first personal finance tracker/planner](https://github.com/Ahasseyp/prometheus/issues/1)

## Summary

This document compares storage strategies for a mobile-first, multi-currency personal finance tracker/planner that must support:

- **Local-first development** — easy to run offline on a laptop with minimal setup.
- **Clean migration to self-hosted production** — the same stack should deploy to a single-tenant or small-scale self-hosted server without forcing a database rewrite.
- **Multi-currency transactions** — USD income and MXN expenses from day one, with correct arithmetic and reporting.
- **Future multi-tenancy** — the data model should grow from single-user/family to multi-tenant accounts without a storage rip-and-replace.

The evaluated options are: **PostgreSQL**, **SQLite**, **local-first sync engines** (ElectricSQL, PowerSync, Replicache), and **managed backends** (Supabase, Neon, Turso).

The recommended shortlist is:

1. **Primary data store: PostgreSQL** — self-hosted or managed. It is the only evaluated engine that cleanly supports multi-tenancy, exact decimal arithmetic, rich JSON/AI metadata, and a stable migration path from local dev to production.
2. **Local-first client cache: SQLite** — used inside the browser/PWA or mobile shell for offline reads and optimistic writes, synced back to Postgres through an explicit API or sync engine.
3. **Sync engine (optional, v2): ElectricSQL or PowerSync** — add them when real-time collaboration or aggressive offline support is required, not as the v1 foundation.

---

## 1. PostgreSQL

### Why it fits

PostgreSQL is a mature, open-source object-relational database under the PostgreSQL License. It is the standard target for self-hosted web backends and is supported by virtually every managed provider.

- **Self-hosting:** Official binaries and Docker images are available; it runs on commodity hardware and is straightforward to containerize. [PostgreSQL Official Site](https://www.postgresql.org/)
- **Exact numeric types:** PostgreSQL recommends `numeric` (arbitrary precision) for monetary amounts and warns against floating-point types for money. [PostgreSQL 18 Docs — Numeric Types](https://www.postgresql.org/docs/current/datatype-numeric.html) The built-in `money` type is locale-sensitive and not suitable for multi-currency applications. [PostgreSQL 18 Docs — Monetary Types](https://www.postgresql.org/docs/current/datatype-money.html)
- **Multi-tenancy:** Row-Level Security (RLS) policies can restrict rows to a tenant or user by evaluating `current_user` or application-set variables. [PostgreSQL 18 Docs — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- **JSON/AI friendliness:** JSONB columns can store LLM-generated tags, insights, and structured voice-input metadata without schema migrations for every new AI field.
- **Concurrency:** PostgreSQL handles many concurrent writers; SQLite is single-writer per file. [SQLite — When to Use](https://www.sqlite.org/whentouse.html)

### Trade-offs

- **Not local-first by default:** A local dev laptop needs a running Postgres (easy with Docker, but still a service dependency).
- **Slightly heavier than SQLite for tiny prototypes:** For a pure offline prototype, SQLite is faster to start.

### Migration path

Using a migration tool such as Drizzle, Prisma, or Flyway, the same schema can run on a local Postgres container, a managed Postgres, and a self-hosted Postgres. There is no schema or query rewrite when moving from local to production.

---

## 2. SQLite

### Why it fits

SQLite is a public-domain C library that embeds a full SQL engine in a single file. It is built into most phones and is ideal for device-local storage.

- **Local-first development:** A file-based database needs no server process.
- **Client-side offline cache:** SQLite runs in the browser via WASM (e.g., `wa-sqlite`, PGlite) or in a mobile app (React Native, Capacitor). [SQLite Home](https://www.sqlite.org/index.html)
- **No concurrency contention for single-user apps:** For a single personal-finance user, SQLite's single-writer-per-file limit is rarely a problem.

### Trade-offs

- **Single writer per file:** SQLite allows unlimited readers but only one writer at a time. For a backend shared by multiple users/devices, this becomes a bottleneck. [SQLite — When to Use](https://www.sqlite.org/whentouse.html)
- **No built-in row-level security:** Multi-tenancy must be enforced entirely in application code.
- **Network file-system risks:** SQLite is explicitly not recommended when the database file lives on a network share accessed by multiple clients. [SQLite — When to Use](https://www.sqlite.org/whentouse.html)
- **Money arithmetic:** SQLite has no native `numeric` type; monetary amounts should be stored as integer minor units (e.g., cents) to avoid floating-point rounding.

### Role in this project

SQLite is recommended as the **client-side cache**, not as the production backend. Pairing SQLite on the client with PostgreSQL on the server gives a clean local-first UX while preserving backend correctness.

---

## 3. Local-First Sync Engines

Sync engines replicate data between a backend database and a local SQLite (or embedded) database. They promise offline-first UX, real-time collaboration, and simplified state management.

### 3.1 ElectricSQL

**Model:** ElectricSQL is a **read-path sync engine** for PostgreSQL. It syncs subsets of Postgres data to local clients over HTTP using a primitive called a **Shape**.

- **Backend requirement:** PostgreSQL 14+ with logical replication enabled. [Electric — Deployment](https://electric-sql.com/docs/sync/guides/deployment)
- **Local client:** Can sync into plain objects or into **PGlite**, an embedded Postgres that runs in WASM/Node.js. [PGlite](https://pglite.dev/)
- **Write path:** Electric does **not** provide built-in write-path sync. Writes must be sent back to Postgres through your own API or through the local PGlite + change-log pattern. [Electric — Writes Guide](https://electric-sql.com/docs/sync/guides/writes)
- **Authorization:** Shape requests should be proxied through your backend so the server can set the `table`, `where`, and `queryable_columns` parameters and enforce multi-tenancy. [Electric — Auth Guide](https://electric-sql.com/docs/sync/guides/auth)
- **Licensing:** Open source under Apache 2.0. [Electric Pricing](https://electric-sql.com/pricing)
- **Pricing (managed):** Pay-as-you-go for writes and retention; reads/egress are free. Pro plan is $249/month. [Electric Pricing](https://electric-sql.com/pricing)
- **Self-hosting:** Docker image `electricsql/electric` runs anywhere with a persistent filesystem and HTTP port. [Electric — Deployment](https://electric-sql.com/docs/sync/guides/deployment)

**Shape limitations:** Shapes are currently single-table; syncing related tables requires multiple shapes or denormalized columns. Subqueries are in preview behind a feature flag. [Electric — Shapes Guide](https://electric-sql.com/docs/sync/guides/shapes)

### 3.2 PowerSync

**Model:** PowerSync is a sync engine that connects a backend database (Postgres, MongoDB, MySQL, SQL Server, or Convex) to a client-side SQLite database.

- **Backend:** Postgres 11+ with logical replication (`wal_level = logical`) and a `powersync` publication. [PowerSync Setup Guide](https://docs.powersync.com/intro/setup-guide)
- **Client-side:** SQLite on the device (web, React Native, Node.js, Capacitor, Flutter, etc.). [PowerSync Setup Guide](https://docs.powersync.com/intro/setup-guide)
- **Authorization:** JWT-based. The backend issues a signed JWT with `sub` = user ID; Sync Streams filter data using `auth.user_id()` and other claims. [PowerSync — Custom Authentication](https://docs.powersync.com/configuration/auth/custom)
- **Sync Streams:** SQL-like stream definitions control which rows sync to each user. This naturally supports per-user and per-tenant filtering. [PowerSync — Sync Streams](https://docs.powersync.com/sync/streams/overview)
- **Licensing:** Client SDKs are open-source (Apache 2.0 / MIT). The server-side PowerSync Service and CLI are under the **Functional Source License (FSL)**. [PowerSync — Open Source](https://www.powersync.com/open-source)
- **Pricing (managed):** Free tier up to 2 GB synced/month; Pro from $49/month; Team from $599/month. [PowerSync Pricing](https://www.powersync.com/pricing)
- **Self-hosting:** Docker image `journeyapps/powersync-service` is available; a CLI scaffolds a local Docker Compose stack. [PowerSync Setup Guide](https://docs.powersync.com/intro/setup-guide)

**PowerSync is a strong candidate** if the project decides to pursue true offline-first sync, because it supports the exact Postgres → SQLite pattern and has built-in user-scoped sync streams.

### 3.3 Replicache

**Status:** Replicache is now in maintenance mode. The GitHub repository was archived by the owner on June 10, 2026. The company no longer charges for its use but has shifted focus to **Zero**, a successor project. [Replicache Home](https://replicache.dev/) [Replicache GitHub](https://github.com/rocicorp/replicache)

**Recommendation:** Do not build a new system on Replicache. The successor, Zero, was not independently verified as production-ready during this research; it is not a known stable option for v1.

---

## 4. Managed / Hosted Options

### 4.1 Supabase

Supabase is an open-source Firebase alternative built on PostgreSQL. It bundles Auth, REST/GraphQL APIs, Realtime, Storage, and Edge Functions.

- **Pricing:** Free tier with 500 MB database and 50,000 MAUs; Pro starts at $25/month plus compute. [Supabase Pricing](https://supabase.com/pricing)
- **Self-hosting:** Official Docker Compose setup exists; the stack includes Kong, Auth, PostgREST, Realtime, Storage, and Postgres. Minimum recommended 4 GB RAM / 2 cores. [Supabase — Self-Hosting with Docker](https://supabase.com/docs/guides/hosting/docker)
- **Why consider it:** If the project needs built-in auth, file storage for receipts, and a managed dashboard from day one, Supabase is attractive.
- **Caveat:** The full self-hosted stack is heavier than a plain Postgres container. For a minimal self-hosted v1, plain Postgres + a custom backend may be simpler.

### 4.2 Neon

Neon is a serverless PostgreSQL platform with scale-to-zero, branching, and read replicas.

- **Pricing:** Free tier with 0.5 GB storage and 100 CU-hours/month; Launch and Scale are pay-as-you-go with no monthly minimum. [Neon Pricing](https://neon.tech/pricing)
- **Why consider it:** Excellent for development branches and low-traffic production. Scale-to-zero can keep a small v1 nearly free.
- **Caveat:** It is a managed service, not self-hosted. The project explicitly wants self-hosted v1, so Neon is best used only for development/CI.

### 4.3 Turso

Turso is a managed SQLite platform with embedded replicas and sync.

- **Pricing:** Free tier with 100 databases, 5 GB storage, and 3 GB syncs/month; paid plans from $4.99/month. [Turso Pricing](https://turso.tech/pricing)
- **Why consider it:** Good for SQLite-centric local-first apps.
- **Caveat:** SQLite's single-writer-per-file and lack of RLS make it a weaker fit for multi-tenant backends. Not recommended as the primary backend for this project.

---

## 5. Multi-Currency Data Model

### Storage rules

- **Never store monetary amounts as floating-point** (`real`, `double precision`, JavaScript `number`). Use exact types.
- **PostgreSQL:** use `numeric(19, 4)` (or similar) for amounts and store the ISO currency code (e.g., `USD`, `MXN`) in a separate `currency` column. [PostgreSQL 18 Docs — Numeric Types](https://www.postgresql.org/docs/current/datatype-numeric.html)
- **SQLite:** store amounts as integer **minor units** (e.g., cents for USD, centavos for MXN) and convert in application code. SQLite's integer types are exact.
- **Exchange rates:** keep a separate `exchange_rates` table keyed by `(from_currency, to_currency, date)` with a `numeric` rate, not a float. The application layer converts at the rate effective for the transaction date.
- **Reporting currency:** Store both the original amount/currency and a normalized amount in a reporting currency if dashboards need to aggregate across currencies.

### Example schema sketch

```sql
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  currency text NOT NULL, -- ISO 4217, e.g. 'USD', 'MXN'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id),
  amount numeric(19, 4) NOT NULL, -- exact amount in account currency
  currency text NOT NULL,
  -- optional: normalized amount for reporting
  amount_usd numeric(19, 4),
  description text,
  transacted_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE exchange_rates (
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric(19, 8) NOT NULL,
  effective_date date NOT NULL,
  PRIMARY KEY (from_currency, to_currency, effective_date)
);
```

---

## 6. Multi-Tenancy Considerations

The project currently envisions users + accounts, with future multi-tenancy.

### Recommended pattern: shared database, row-level security

- Add a `tenant_id` column to every tenant-scoped table.
- Create a PostgreSQL RLS policy that restricts rows to the current tenant: `tenant_id = current_setting('app.current_tenant')::uuid`.
- The application sets `app.current_tenant` per request/session after authentication.
- This avoids the operational complexity of schema-per-tenant or database-per-tenant while still giving strong data isolation.

[PostgreSQL 18 Docs — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

### Sync-engine multi-tenancy

- **ElectricSQL:** tenant filtering must be done in the proxy that fronts Electric. The proxy sets the `where` clause server-side and never lets the client choose the table or tenant parameter. [Electric — Auth Guide](https://electric-sql.com/docs/sync/guides/auth)
- **PowerSync:** Sync Streams support `auth.user_id()` and custom `auth.parameters()` claims, making per-tenant/user filtering straightforward. [PowerSync — Sync Streams](https://docs.powersync.com/sync/streams/overview)

---

## 7. Recommendation Matrix

| Requirement | PostgreSQL | SQLite | ElectricSQL | PowerSync | Replicache | Supabase | Neon | Turso |
|---|---|---|---|---|---|---|---|---|
| Local-first dev | Good (Docker) | Excellent | Good (needs Postgres) | Good (needs Postgres) | Good (client lib) | Good (CLI/Docker) | Good (managed) | Excellent |
| Self-hosted production | Excellent | Poor for multi-user | Good (Docker) | Good (Docker/FSL server) | N/A (archived) | Good (Docker, heavy) | Managed only | Managed only |
| Multi-currency exact arithmetic | Excellent (`numeric`) | Good (integer minor units) | Pass-through (depends on Postgres) | Pass-through (depends on Postgres) | Client-side | Pass-through (Postgres) | Pass-through (Postgres) | Good (integer minor units) |
| Future multi-tenancy | Excellent (RLS) | Weak (app-level only) | Good (proxy-level) | Good (Sync Streams) | N/A | Good (RLS + auth) | Good (RLS) | Weak (app-level only) |
| Offline PWA/mobile | Needs sync engine | Excellent (client SQLite) | Good (with PGlite client) | Excellent (SQLite client) | Excellent | Needs sync layer | Needs sync layer | Good (embedded replicas) |
| Operational simplicity | Moderate | High | Moderate | Moderate | Low (archived) | Lower (managed) / Higher (self-hosted) | High (managed) | High (managed) |
| Open-source license | PostgreSQL License | Public domain | Apache 2.0 | Client: Apache 2.0; Server: FSL | Apache 2.0 (archived) | Open-source stack | Proprietary service | Proprietary service |

---

## 8. Proposed Strategy

### Phase 1: v1 (self-hosted, manual entry, single/family user)

1. **Backend database: PostgreSQL** running in Docker locally and in production.
   - Use `numeric(19, 4)` for money and ISO currency codes for multi-currency support.
   - Add `tenant_id` and enable RLS from the start so the schema is multi-tenant-ready.
2. **Client storage: SQLite** in the PWA/mobile shell for offline reads and optimistic local state.
3. **Write path:** Send writes through the application backend API; do not rely on a sync engine for v1.
4. **Migration:** Use a schema migration tool (Drizzle, Prisma, or Flyway) so local and production schemas stay identical.

### Phase 2: future offline-first / multi-device sync

1. Evaluate **PowerSync** first if the project stays on the Postgres + SQLite client path and wants full bidirectional offline sync with built-in user-scoped streams.
2. Evaluate **ElectricSQL** if the project prefers an embedded Postgres client (PGlite) and is comfortable implementing the write path through the existing API.

### What to avoid

- **Do not use Replicache for new work** — it is archived and in maintenance mode.
- **Do not use SQLite as the production backend** — single-writer limits and lack of RLS make it a poor fit for multi-tenant or multi-user growth.
- **Do not store money as floating point** in any database.

---

## 9. Open Questions for Follow-Up

- What is the final decision on the **offline-first vs online-first architecture**? (Covered by ticket #7.) This determines whether a sync engine belongs in v1 or v2.
- What backend stack will run the API? (Covered by ticket #3.) This affects whether ElectricSQL's write-through-API model is natural or adds friction.
- Will the v1 client be a PWA, React Native, or both? This affects which SQLite client libraries are relevant.

---

## 10. Sources

- PostgreSQL. "PostgreSQL: The World's Most Advanced Open Source Relational Database." https://www.postgresql.org/
- PostgreSQL. "8.1. Numeric Types." https://www.postgresql.org/docs/current/datatype-numeric.html
- PostgreSQL. "8.2. Monetary Types." https://www.postgresql.org/docs/current/datatype-money.html
- PostgreSQL. "5.9. Row Security Policies." https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- SQLite. "SQLite Home Page." https://www.sqlite.org/index.html
- SQLite. "Appropriate Uses For SQLite." https://www.sqlite.org/whentouse.html
- ElectricSQL. "Electric Sync." https://electric-sql.com/docs/sync
- ElectricSQL. "Shapes." https://electric-sql.com/docs/sync/guides/shapes
- ElectricSQL. "Writes." https://electric-sql.com/docs/sync/guides/writes
- ElectricSQL. "Auth." https://electric-sql.com/docs/sync/guides/auth
- ElectricSQL. "Deployment." https://electric-sql.com/docs/sync/guides/deployment
- ElectricSQL. "Pricing." https://electric-sql.com/pricing
- ElectricSQL. "PGlite." https://pglite.dev/
- PowerSync. "Setup Guide." https://docs.powersync.com/intro/setup-guide
- PowerSync. "Sync Streams." https://docs.powersync.com/sync/streams/overview
- PowerSync. "Custom Authentication." https://docs.powersync.com/configuration/auth/custom
- PowerSync. "Pricing." https://www.powersync.com/pricing
- PowerSync. "Open-Source & Source-Availability." https://www.powersync.com/open-source
- Replicache. "Realtime Sync for Any Backend Stack." https://replicache.dev/
- Replicache. GitHub repository (archived). https://github.com/rocicorp/replicache
- Supabase. "Pricing." https://supabase.com/pricing
- Supabase. "Self-Hosting with Docker." https://supabase.com/docs/guides/hosting/docker
- Neon. "Pricing Plans." https://neon.tech/pricing
- Turso. "Pricing." https://turso.tech/pricing
