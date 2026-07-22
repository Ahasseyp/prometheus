import { useQuery } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type HouseholdMeOutput = inferRouterOutputs<AppRouter>['household']['me'];

export function useHouseholdMe() {
  return useQuery({
    queryKey: ['household', 'me'],
    queryFn: () => trpc.household.me.query(),
  });
}
