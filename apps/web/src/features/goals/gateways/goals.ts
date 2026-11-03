import { useQuery } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type GoalListOutput = inferRouterOutputs<AppRouter>['goal']['list'];
export type Goal = GoalListOutput[number];

export const goalListQueryKey = ['goals', 'list'];

export function useGoals() {
  return useQuery({
    queryKey: goalListQueryKey,
    queryFn: () => trpc.goal.list.query(),
  });
}
