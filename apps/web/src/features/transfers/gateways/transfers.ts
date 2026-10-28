import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

export type Transfer = inferRouterOutputs<AppRouter>['transfer']['get'];
