import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type GoalListOutput = inferRouterOutputs<AppRouter>['goal']['list'];
export type Goal = GoalListOutput[number];
type CreateGoalInput = inferRouterInputs<AppRouter>['goal']['create'];
type UpdateGoalInput = inferRouterInputs<AppRouter>['goal']['update'];
type DeleteGoalInput = inferRouterInputs<AppRouter>['goal']['delete'];

export const goalListQueryKey = ['goals', 'list'];

export function useGoals() {
  return useQuery({
    queryKey: goalListQueryKey,
    queryFn: () => trpc.goal.list.query(),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGoalInput) => trpc.goal.create.mutate(input),
    onSuccess: () => invalidateGoals(queryClient),
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateGoalInput) => trpc.goal.update.mutate(input),
    onSuccess: () => invalidateGoals(queryClient),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteGoalInput) => trpc.goal.delete.mutate(input),
    onSuccess: () => invalidateGoals(queryClient),
  });
}

function invalidateGoals(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: goalListQueryKey });
}
