# Research: Offline-first vs online-first mobile architecture

**Ticket:** #7 "Research: Offline-first vs online-first mobile architecture"  
**Map:** #1 "Map: Architecture for AI-first personal finance tracker/planner"  
**Repo:** Ahasseyp/prometheus  
**Date:** 2026-07-13

## 1. Executive recommendation

For v1 of a mobile-first personal finance tracker, an **online-first, mobile-optimized PWA** is the safer default. It is faster to build, easier to secure, and sufficient for manual entry + AI-assisted insights as long as the app is built with **offline-aware resilience** (custom offline page, optimistic UI for manual transactions, and a clear UX for when AI features are unavailable).

A **true offline-first/local-first architecture with bidirectional sync** should be treated as a follow-up architecture milestone rather than a v1 requirement. The reason is not technical infeasibility—tools for local-first web apps are now production-grade—but the interaction between sync correctness, data privacy, and self-hosted operations adds significant complexity that conflicts with the goal of shipping a public product from day one.

## 2. Definitions used in this note

- **Offline-first / local-first PWA:** A web app that stores the authoritative copy of the user’s data on the device (IndexedDB, Origin Private File System, SQLite via WASM, or a sync engine), lets the user read and write while offline, and reconciles changes with a backend when the network is available. The “local” copy is the source of truth between syncs.
- **Online-first mobile-optimized web app:** A web app whose primary data flow is request/response to a backend. The backend is the source of truth. It may cache reads and handle transient disconnections gracefully, but core writes generally require a network round-trip.
- **PWA (Progressive Web App):** A web app that can be installed on the device, run offline or in the background, and integrate with the OS via the Web App Manifest, service worker, and related APIs [MDN Progressive web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps).

## 3. High-level trade-off comparison

| Dimension | Offline-first PWA (local sync) | Online-first mobile PWA |
|-----------|----------------------------------|---------------------------|
| **Complexity** | High. Requires client-side DB, sync engine, conflict resolution, migration, and offline UX design. | Low to medium. Standard web stack + caching + optimistic updates. |
| **Time to v1** | Slower. Extra infrastructure, schema design, and failure modes. | Faster. Focus is backend CRUD + frontend. |
| **User experience** | Excellent on flaky networks; instant reads/writes; works on planes/dead zones. | Good with caching; degrades without network; AI features need connectivity anyway. |
| **Self-hosted backend** | More moving parts: sync service, vector DB, queue, persistence, backups. | Fewer moving parts: API + database + optional AI gateway. |
| **Public-product readiness** | Requires extensive testing around sync, data loss, and migration before broad launch. | Easier to secure, audit, and ship. |
| **Data privacy** | User data is on device; backend sees only what is synced. | Data is on the server; requires strong encryption in transit and at rest. |
| **Cross-device use** | Natural if sync is implemented; can become the default. | Requires a backend account model from day one. |
| **AI integration** | AI requires network; local data may need to be sent to cloud APIs, reducing privacy benefit. | No architectural conflict; AI calls are a normal backend/frontend concern. |

## 4. Complexity analysis

### 4.1 Offline-first complexity

A local-first architecture means the client becomes a database node. You must solve problems that a traditional web app delegates to the server:

1. **Client storage choice.** Options include IndexedDB, the Origin Private File System (OPFS), and in-browser SQLite via WASM [web.dev Storage for the web](https://web.dev/articles/storage-for-the-web). For a finance app, a relational model is preferable; SQLite-in-WASM (PGlite) or an object store wrapper (TinyBase, Dexie) are common choices.
2. **Sync semantics.** You need a protocol to reconcile local writes with server writes. Mature options include:
   - **PowerSync:** syncs a backend Postgres/MongoDB/MySQL/SQL Server into client-side SQLite, supports offline writes, and can be self-hosted [PowerSync](https://www.powersync.com), [PowerSync self-hosting docs](https://docs.powersync.com/self-hosting/getting-started).
   - **ElectricSQL:** Postgres sync engine with HTTP/JSON protocol, open-source, supports self-hosting [ElectricSQL](https://electric-sql.com).
   - **TinyBase:** reactive in-memory store with CRDT sync and persistence to IndexedDB, SQLite, or Postgres [TinyBase](https://tinybase.org).
   - **Automerge:** local-first CRDT sync engine [Automerge](https://automerge.org).
   - **Replicache / Zero:** client-side sync frameworks (Replicache is in maintenance; Zero is the successor and is open-source/self-hostable) [Replicache](https://replicache.dev), [Zero](https://zero.rocicorp.dev).
3. **Conflict resolution.** Finance data is sensitive: debits and credits must be exact. CRDTs or server reconciliation must handle concurrent edits without losing money. This is a correctness concern, not just a performance one.
4. **Schema migrations.** You must migrate both the local SQLite/IndexedDB schema and the server schema while preserving pending offline writes.
5. **Testing surface.** You must test across offline, online, reconnecting, multi-tab, and multi-device states. The combination of client state × server state × network state is large.

### 4.2 Online-first complexity

An online-first PWA is essentially a well-built responsive web app with a service worker and cache strategy:

1. **Backend source of truth.** A single PostgreSQL/whatever database, API layer, and auth model. There is no distributed client state to reconcile.
2. **Offline UX.** The app can provide a custom offline page, cache shell assets via the service worker, and cache recent data for reads [web.dev Offline UX design guidelines](https://web.dev/articles/offline-ux-design-guidelines). Writes are queued or disabled with a clear message.
3. **Optimistic updates.** For manual transaction entry, you can update the UI immediately and roll back on failure. This gives the *feeling* of speed without the full machinery of local-first sync.
4. **Faster iteration.** New features require changes to one backend and one frontend. There is no sync protocol to evolve.

For a small team building a public v1, online-first is meaningfully simpler.

## 5. User experience analysis

### 5.1 What offline-first gives you

Offline-first is the gold standard for apps that compete on responsiveness and availability:

- Reads and writes feel instant because they hit local storage first [Zero](https://zero.rocicorp.dev), [Replicache](https://replicache.dev).
- The app works in tunnels, elevators, and on poor mobile networks.
- Multi-device sync can be automatic once the user is authenticated.

This is especially attractive for a finance app where users may want to log a cash expense immediately after paying, regardless of connectivity.

### 5.2 What online-first gives you

A well-built online-first PWA still provides:

- Installability and an app-like launch surface [web.dev What makes a good Progressive Web App?](https://web.dev/articles/pwa-checklist).
- Fast repeat loads from service-worker caches [web.dev Service workers and the Cache Storage API](https://web.dev/articles/service-workers-cache-storage).
- Clear, honest UX: “Your transaction was saved to the server,” or “You’re offline; we’ll save this when you reconnect.”

The downside is that core writes are unavailable without a network. The upside is that the mental model is simple and honest for users, which is important for finance.

### 5.3 AI changes the UX equation

Because the project uses **cloud LLM APIs**, the most valuable AI features (categorization, planning, forecasting, anomaly detection) will require a network connection regardless of whether the core data is local or remote. An offline-first architecture does not eliminate network dependence for the AI experience; it only eliminates it for data entry and simple queries. The incremental UX win of offline-first is therefore smaller than it first appears for this specific product.

## 6. Self-hosted backend requirements

The project context says **“Local-first during development, self-hosted for v1.”** Both architectures can be self-hosted, but the local-first option carries more infrastructure.

### 6.1 Offline-first self-hosting stack

A minimal local-first stack could look like:

- Client: PWA + React/Vue/Svelte + client-side SQLite or TinyBase + sync SDK.
- Sync server: PowerSync Service or ElectricSQL sync server (both offer Docker images).
- Backend database: PostgreSQL (with row-level security / sync rules).
- Backend API: For auth, custom mutations, and AI orchestration.
- Reverse proxy / TLS termination: Caddy or Nginx.
- Backups: Database backups + client-side export/restore path (because client data is authoritative until sync).

PowerSync explicitly notes that the dashboard is not available when self-hosting and provides Docker Compose demos for local development [PowerSync self-hosting docs](https://docs.powersync.com/self-hosting/getting-started). ElectricSQL provides an open protocol and self-hosting documentation [ElectricSQL](https://electric-sql.com).

Operational concerns:
- The sync service must be up for the app to be “live” across devices.
- You must monitor sync lag, conflict rates, and client storage errors.
- Client-side storage is at risk of eviction on mobile devices unless the app is installed as a PWA and requests persistent storage [MDN Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [WebKit Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/).

### 6.2 Online-first self-hosting stack

A minimal online-first stack could look like:

- Client: PWA + React/Vue/Svelte + service worker + optional optimistic cache.
- Backend API: Any framework (Node/Express, Next.js API routes, Python/FastAPI, etc.).
- Database: PostgreSQL.
- Auth: Self-hosted or open-source auth provider.
- Reverse proxy / TLS: Caddy or Nginx.
- Backups: Database backups only.

This is a smaller operational surface. There is no sync service to tune, no client-side DB migration path, and no distributed state to debug.

## 7. Public-product readiness

### 7.1 Finance app trust factors

A public finance app must earn trust. The architecture must be explainable:

- **Data loss:** Users will not forgive lost transactions. An offline-first app must prove that writes survive browser eviction, sync failures, and crashes. This requires automated tests and likely a manual export/backup feature.
- **Correctness:** Balance calculations must be deterministic. Sync conflicts must not double-count or lose money. This is hard to verify without formal tests.
- **Security:** Financial data at rest on the device should be encrypted. The Web Crypto API is available in browsers and Web Workers, but key management is non-trivial [MDN Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API). On the server, the same encryption-at-rest and TLS requirements apply to both architectures.
- **Privacy:** A local-first app can keep raw transaction data off the server, which is a strong privacy story. However, if the AI features send data to a cloud LLM, that privacy benefit is partially offset.

### 7.2 Which architecture is easier to launch?

An online-first PWA is easier to launch because:

- The security model is conventional (HTTPS, server-side auth, encrypted database).
- The data model is centralized; backup and recovery are straightforward.
- The offline failure mode is predictable: the app tells the user it cannot save.
- It is easier to add an offline-first sync layer later than to remove a buggy one after launch.

## 8. Storage and eviction realities

Browser storage for a PWA is powerful but has caveats:

- IndexedDB, the Cache API, and the Origin Private File System are supported in modern browsers and are the recommended storage mechanisms [web.dev Storage for the web](https://web.dev/articles/storage-for-the-web).
- Quotas are large on desktop (Chrome up to 60% of disk per origin, Firefox up to 10 GiB group limit, Safari up to 60% of disk for browser apps since Safari 17) [MDN Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [WebKit Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/).
- On mobile Safari, **installed PWAs added to the home screen get a separate storage container** and are not subject to the 7-day script-writable storage cap that applies to Safari tabs [web.dev Storage for the web](https://web.dev/articles/storage-for-the-web). This is an important argument for making the app installable as a PWA even if it is online-first.
- Data can still be evicted under storage pressure. Best-effort storage is least-recently-used evicted. Persistent storage (`navigator.storage.persist()`) can be requested, but browsers grant it based on heuristics [MDN Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

For a finance app, installing as a PWA and requesting persistent storage is recommended regardless of offline-first vs online-first.

## 9. Hybrid and migration paths

The choice is not forever. A pragmatic path is:

1. **v1:** Online-first PWA with service worker caching, optimistic manual entry, and a clear offline state. This is the public product.
2. **v1.5:** Add background sync for queued manual transactions [MDN Background Synchronization API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API). This is a small increment that improves offline UX without full local-first sync.
3. **v2:** Evaluate a local-first sync layer (PowerSync, ElectricSQL, or Zero) once the data model, auth, and security model are stable. This is a deliberate architecture upgrade, not a launch requirement.

## 10. Key findings summary

- **Offline-first is technically viable and now well-supported.** Mature sync engines exist, many can be self-hosted, and browser storage quotas are large enough for a personal finance dataset.
- **Offline-first adds material complexity and risk.** Sync correctness, conflict resolution, client storage eviction, and migrations are non-trivial, especially for financial data where exactness matters.
- **Online-first is faster and safer for v1.** A responsive PWA with service-worker caching and a clear offline UX can deliver a good mobile experience with far less engineering risk.
- **AI features require network anyway.** Because cloud LLM APIs are part of the product, offline-first does not produce a fully offline product; it only offline-enables data entry and simple reads.
- **Installable PWA is valuable in both cases.** It improves storage durability on mobile Safari and gives users the app-like experience they expect. The app should be designed as a PWA from the start.
- **A hybrid migration path is viable.** Start online-first with offline-aware UX, then add a sync engine later when the product and data model are mature.

## 11. Recommendation for v1

Choose an **online-first, installable PWA architecture** for v1. Build it to be offline-aware, not offline-first. Plan the data model and backend so that a local-first sync layer can be added in v2 without a full rewrite. This balances speed-to-market, operational simplicity, and the long-term vision of a resilient, multi-device finance app.

## 12. Sources and citations

- MDN, “Progressive web apps.” https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- MDN, “IndexedDB API.” https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN, “Storage quotas and eviction criteria.” https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- MDN, “Web Crypto API.” https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- MDN, “Background Synchronization API.” https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API
- web.dev, “What makes a good Progressive Web App?” https://web.dev/articles/pwa-checklist
- web.dev, “Service workers and the Cache Storage API.” https://web.dev/articles/service-workers-cache-storage
- web.dev, “Offline UX design guidelines.” https://web.dev/articles/offline-ux-design-guidelines
- web.dev, “Storage for the web.” https://web.dev/articles/storage-for-the-web
- WebKit, “Updates to Storage Policy.” https://webkit.org/blog/14403/updates-to-storage-policy/
- Local-First Software, directory and principles. https://localfirstweb.dev/
- ElectricSQL. https://electric-sql.com
- PowerSync. https://www.powersync.com
- PowerSync, “Self-Hosting.” https://docs.powersync.com/self-hosting/getting-started
- TinyBase. https://tinybase.org
- Automerge. https://automerge.org
- Replicache. https://replicache.dev
- Zero by Rocicorp. https://zero.rocicorp.dev
- PGlite. https://pglite.dev
- Capacitor by Ionic. https://capacitorjs.com/
- Ink & Switch, “Local-first software: you own your data, in spite of the cloud.” https://www.inkandswitch.com/local-first
