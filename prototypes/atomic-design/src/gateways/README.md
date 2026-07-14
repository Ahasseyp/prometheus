# Gateways

Gateways are the data-access layer for the dashboard. Each file groups the **fetch functions**, **query options**, and **mutation hooks** for a single domain (e.g. `team`, `project`, `releases`).

This guide describes the patterns every gateway should follow, based on [TkDodo's "Creating Query Abstractions"](https://tkdodo.eu/blog/creating-query-abstractions).

---

## Facade: `~/lib/react-query`

All React Query imports go through a single facade module at `~/lib/react-query` instead of importing `@tanstack/react-query` directly. This module re-exports everything the app needs from the library:

```typescript
// lib/react-query.ts

export {
  useQuery,
  useSuspenseQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  queryOptions,
  infiniteQueryOptions,
  QueryClient,
  QueryClientProvider,
  QueryCache,
} from '@tanstack/react-query';

export type {
  UseQueryResult,
  UseSuspenseQueryResult,
  UseInfiniteQueryResult,
  UseMutationResult,
  QueryKey,
} from '@tanstack/react-query';
```

Every gateway file and every component imports from this facade:

```typescript
// gateway
import { queryOptions } from '~/lib/react-query';

// component
import { useQuery, useSuspenseQuery } from '~/lib/react-query';
```

Never import `@tanstack/react-query` directly outside of `~/lib/react-query.ts`.

**Why a facade?**

- **Single seam for replacement.** If the library changes its export surface (as it did between v4 and v5), you fix one file.
- **Controlled API surface.** The app only uses what the facade exposes. You won't accidentally pull in unstable or deprecated APIs scattered across dozens of files.
- **Custom extensions.** If you ever need an app-wide wrapper (e.g. a `useQuery` that injects default error handling or telemetry), you add it here without a codebase-wide find-and-replace.

---

## Core idea: `queryOptions` over custom hooks

The primary abstraction is **`queryOptions()`**, not a custom hook. `queryOptions` is a plain function — it works in components, event handlers, server-side code, route loaders, and anywhere else you need a query configuration. At runtime it does nothing; on the type level it preserves full generic inference so you never have to annotate generics manually.

Custom hooks like `useInvoice()` tie you to a specific React Query hook (`useQuery`), which means you can't reuse the same configuration with `useSuspenseQuery`, `useQueries`, or imperative calls like `queryClient.prefetchQuery`. They also create a TypeScript headache the moment you try to forward options like `select` or `throwOnError`.

```typescript
// gateway: releases.ts

import { queryOptions } from '~/lib/react-query';

function releaseOptions({ projectId, releaseId }: { projectId: string; releaseId: string }) {
  return queryOptions({
    queryKey: ['release', 'detail', { projectId, releaseId }],
    queryFn: () => fetchRelease(projectId, releaseId),
  });
}
```

`releaseOptions` only contains what should be shared across **every** usage: the `queryKey` and the `queryFn`. It is not configurable — that's the point.

---

## Composing at the call site

Per-usage options (`staleTime`, `throwOnError`, `select`, `enabled`, etc.) are added by spreading `queryOptions` into the hook at the call site:

```typescript
// component

const releaseQuery = useQuery({
  ...releaseOptions({ projectId, releaseId }),
  staleTime: 5 * 60 * 1000,
});

const releaseDate = useQuery({
  ...releaseOptions({ projectId, releaseId }),
  select: (release) => release.createdAt,
});

const release = useSuspenseQuery(releaseOptions({ projectId, releaseId }));
```

All three usages share the same key and fetch logic but differ in behavior. Types are fully inferred everywhere — `releaseDate.data` is `string | undefined`, `release.data` is `Release` (no `undefined` because Suspense guarantees data).

This pattern avoids:

- Wrapping every query in a custom hook that accepts a growing bag of options.
- Manually threading TypeScript generics through `UseQueryOptions<T>`.
- Being locked into `useQuery` when you later need `useSuspenseQuery` or `useQueries`.

---

## Query-key factory: `<entity>Keys`

Each gateway defines an `<entity>Keys` object that builds every query key for the domain. Keys are arranged as a **hierarchy** so that any level of the hierarchy is a valid invalidation prefix.

```typescript
// gateway: integration.ts

type IntegrationListQueryParams = {
  size?: number;
  $select?: string;
};

const integrationKeys = {
  all: (projectId: string | undefined) => {
    return ['integration', { projectId }] as const;
  },
  lists: (projectId: string | undefined) => {
    return [...integrationKeys.all(projectId), 'list'] as const;
  },
  list: (projectId: string | undefined, queryParams?: IntegrationListQueryParams) => {
    return [...integrationKeys.lists(projectId), { queryParams }] as const;
  },
  detail: (projectId: string | undefined, integrationId: string) => {
    return [...integrationKeys.all(projectId), 'detail', integrationId] as const;
  },
};
```

Each method **spreads the level above it and appends one segment**, so the keys form nested prefixes:

| Method                             | Resulting key                                             | Scope                              |
| ---------------------------------- | --------------------------------------------------------- | ---------------------------------- |
| `all(projectId)`                   | `['integration', { projectId }]`                          | Everything for the project         |
| `lists(projectId)`                 | `['integration', { projectId }, 'list']`                  | All list variants for the project  |
| `list(projectId, queryParams)`     | `['integration', { projectId }, 'list', { queryParams }]` | One specific list (filter) variant |
| `detail(projectId, integrationId)` | `['integration', { projectId }, 'detail', integrationId]` | One specific record                |

Because React Query matches array keys as prefixes by default, invalidating `lists(projectId)` wipes every cached list variant for that project regardless of `queryParams`. Invalidating `all(projectId)` wipes both lists and details. You only need to think about **which level you want to invalidate** — the factory makes each level cheap to express.

**Use the factory inside `*Options`** — never write `queryKey: ['integration', ...]` inline:

```typescript
export function integrationsOptions({
  projectId,
  queryParams,
  enabled = true,
}: {
  projectId: string | undefined;
  queryParams?: IntegrationListQueryParams;
  enabled?: boolean;
}) {
  return queryOptions({
    queryKey: integrationKeys.list(projectId, queryParams),
    queryFn: () => fetchIntegrations({ projectId, queryParams }),
    enabled: enabled && Boolean(projectId),
  });
}
```

**Conventions:**

1. **Name it `<entity>Keys`** (lowercase entity, plural `Keys`). Keep it file-local — don't export it unless another gateway needs to read it.
2. **Singular root segment** — `'integration'`, not `'integrations'`.
3. **`all(...)` carries the scope.** Parent-resource IDs (e.g. `projectId`, `teamId`) go in the `all` object so every nested key inherits them as part of its prefix. This is what makes "invalidate everything for this project" a one-liner.
4. **`lists` is plural, `list` is singular.** `lists` returns the prefix that matches every list variant; `list(filters)` returns the specific key for one filter combination. Same convention for `details` / `detail` if you ever have multiple detail variants — typically you can skip `details` and go straight to `detail(id)` when there's a single detail shape.
5. **Filter values are wrapped in a single object slot** at the end of the key (e.g. `{ queryParams }`). Never spread filter values as bare positional segments — React Query DevTools will render them anonymously and prefix-invalidation will be harder to reason about.
6. **Use `as const`** on each return so the tuple type narrows correctly for TypeScript.

> **Why not derive the prefix by stripping `undefined` from a params object?**
> A util that omits `undefined` keys and collapses empty objects would also produce a working prefix, but it conflates "what is this cache entry's key?" with "what is the invalidation prefix?" — two different questions. It's implicit (the prefix becomes an emergent property of which args you happen to pass), it makes the `queryKey` type a union of tuple lengths, and it doesn't extend to multi-level hierarchies like `all` / `lists` / `detail`. The explicit factory is grep-able, callable, and types cleanly.

---

## Imperative usage

`queryOptions` is a plain function, so it works with imperative `QueryClient` methods too. Use `*Options(...).queryKey` for **one specific entry** and the `<entity>Keys` factory for **subtree** operations:

```typescript
// prefetch one specific list variant
function handleMouseEnter(projectId: string) {
  queryClient.prefetchQuery(integrationsOptions({ projectId }));
}

// read one specific list variant from the cache
const cached = queryClient.getQueryData(integrationsOptions({ projectId }).queryKey);

// invalidate every list variant for the project (prefix match)
queryClient.invalidateQueries({
  queryKey: integrationKeys.lists(projectId),
});

// invalidate everything (lists + details) for the project
queryClient.invalidateQueries({
  queryKey: integrationKeys.all(projectId),
});
```

`*Options(...).queryKey` is the exact key for one cached entry; `<entity>Keys.<level>(...)` is the prefix that covers a whole subtree.

---

## Infinite queries

`infiniteQueryOptions` is the counterpart for paginated/cursor-based queries:

```typescript
import { infiniteQueryOptions } from '~/lib/react-query';

function releasesInfiniteOptions({
  projectId,
  pageSize = 20,
}: {
  projectId: string;
  pageSize?: number;
}) {
  return infiniteQueryOptions({
    queryKey: ['release', 'list', { projectId, pageSize }],
    queryFn: ({ pageParam = 0 }) => fetchReleases({ projectId, pageSize, skip: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPageCursor ?? undefined,
  });
}
```

Consumed the same way:

```typescript
const releases = useInfiniteQuery({
  ...releasesInfiniteOptions({ projectId }),
  enabled: Boolean(projectId),
});
```

---

## Mutations

Mutations don't benefit from `queryOptions` (they don't have query keys or caching semantics). Keep them as exported hooks that encapsulate the `mutationFn` and cache updates:

```typescript
export function useCreateIntegration(
  projectId: string | undefined,
  options?: { onSuccess?: (integration: IntegrationEntity) => void | Promise<void> },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (type: Action) => createIntegration({ projectId, type }),
    onSuccess: async (integration) => {
      // prefix invalidation — covers every cached list variant for the project
      await queryClient.invalidateQueries({
        queryKey: integrationKeys.lists(projectId),
      });
      await options?.onSuccess?.(integration);
    },
  });
}
```

For targeted cache writes, use `*Options(...).queryKey` to address one exact entry:

```typescript
queryClient.setQueryData<IConnectIntegration>(
  integrationOptions({ projectId, integrationId }).queryKey,
  (old) => (old ? { ...old, ...patch } : old),
);
```

Use the **factory** when you want to invalidate a subtree; use **`*Options(...).queryKey`** when you want to read or write one exact entry. Never duplicate raw key arrays in mutation files.

---

## File structure

```
gateways/
├── constants.ts          # shared pagination defaults (DEFAULT_PAGE_SIZE, PaginatedResponseParams)
├── errors.ts             # PublicError class for user-facing errors (used by QueryCache onError)
├── <domain>.ts           # one file per domain (e.g. team.ts, project.ts, whoami.ts)
└── <domain>/             # subdirectory when a domain needs co-located tests or multiple files
    ├── index.ts
    └── index.spec.ts
```

The layout is flat — one file per domain. Promote to a subdirectory when you need co-located tests or the file grows large enough to split.

Each gateway file should include:

| Export / member       | What                                                                                       | Example                                     |
| --------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `fetch*` functions    | Typed async functions that call `api.get` / `api.post` / etc. and throw on failure.        | `fetchIntegration`, `fetchIntegrations`     |
| `<entity>Keys`        | Hierarchical query-key factory object (usually file-local `const`).                        | `integrationKeys`                           |
| `*Options` functions  | Exported `queryOptions()` / `infiniteQueryOptions()` wrappers that consume `<entity>Keys`. | `integrationOptions`, `integrationsOptions` |
| `use*` mutation hooks | `useMutation` hooks with cache orchestration via `<entity>Keys`.                           | `useCreateIntegration`                      |
| Domain types          | Interfaces and enums used by the above.                                                    | `IntegrationListQueryParams`                |

Avoid exporting `useQuery`-wrapping hooks. If a query needs component-specific behavior (polling, suspense, select), compose it at the call site.

---

## Query key conventions

Keys follow the hierarchical shape **`[entity, scopeParams, type, ...specifics]`**, always produced by an `<entity>Keys` factory:

| Segment       | Position | Description                                                                                            | Values                                 |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| `entity`      | 0        | The domain noun, singular.                                                                             | `'integration'`, `'team'`, `'release'` |
| `scopeParams` | 1        | Parent-resource IDs in an object. Identifies the tenant/project. Omit only for truly global resources. | `{ projectId }`, `{ teamId }`          |
| `type`        | 2        | `'list'` or `'detail'`. Omitted from the `all` root.                                                   | `'list'` \| `'detail'`                 |
| `specifics`   | 3+       | For lists: a single `{ filters }` object. For details: the resource id (and any sub-ids).              | `{ queryParams }`, `integrationId`     |

**Invalidation** works naturally with partial (prefix) matching:

```typescript
// everything for a project — lists + details
queryClient.invalidateQueries({ queryKey: integrationKeys.all(projectId) });

// only lists
queryClient.invalidateQueries({ queryKey: integrationKeys.lists(projectId) });

// one specific record
queryClient.invalidateQueries({
  queryKey: integrationKeys.detail(projectId, integrationId),
});
```

**Rules:**

1. **Always build keys through the `<entity>Keys` factory.** No inline arrays in `*Options`, mutations, or components.
2. **Scope params go in `all`.** Anything that should be part of every prefix below (typically `projectId`) lives in the root.
3. **Filter values are wrapped in a single object** (e.g. `{ queryParams }`) — never spread as bare positional segments.
4. **Use `as const`** on every factory method's return so the tuple type narrows.
5. **`*Options` functions take a single object argument**, never positional parameters.

```typescript
// good
function integrationOptions({ projectId, integrationId }: { ... }) { ... }
integrationOptions({ projectId, integrationId })

// bad
function integrationOptions(projectId: string, integrationId: string) { ... }
integrationOptions(projectId, integrationId)
```

---

## Summary

| Principle           | Do                                                                              | Don't                                                                |
| ------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Imports             | `import { useQuery } from '~/lib/react-query'`                                  | `import { useQuery } from '@tanstack/react-query'`                   |
| Primary abstraction | `queryOptions()` function                                                       | Custom `useX` hook wrapping `useQuery`                               |
| Per-usage config    | Spread + override at call site                                                  | Accept options as hook parameters                                    |
| Type safety         | Let inference flow — no manual generics                                         | Annotate `UseQueryOptions<T>` or `Partial<UseQueryOptions>`          |
| Hook flexibility    | Use with `useQuery`, `useSuspenseQuery`, `useQueries`, `prefetchQuery`          | Lock into a single hook                                              |
| Query keys          | Build through `<entity>Keys` factory                                            | Inline `['integration', ...]` arrays scattered in gateways/mutations |
| Key hierarchy       | `all` / `lists` / `list(filters)` / `detail(id)`                                | One flat key per query with no shared prefix                         |
| Cache key reuse     | `*Options(...).queryKey` for one entry; `<entity>Keys.<level>(...)` for subtree | Duplicate raw key arrays                                             |
| Mutations           | Exported `useMutation` hooks; invalidate via `<entity>Keys`                     | `queryOptions` for mutations; inline key arrays                      |
