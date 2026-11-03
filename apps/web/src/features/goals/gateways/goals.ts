import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';
import { accountsListQueryKey } from '@/features/accounts/gateways/accounts.js';

export type GoalListOutput = inferRouterOutputs<AppRouter>['goal']['list'];
export type Goal = GoalListOutput[number];
export type GoalContributionListOutput = inferRouterOutputs<AppRouter>['goalContribution']['list'];
export type GoalContribution = GoalContributionListOutput[number];
type CreateGoalInput = inferRouterInputs<AppRouter>['goal']['create'];
type UpdateGoalInput = inferRouterInputs<AppRouter>['goal']['update'];
type DeleteGoalInput = inferRouterInputs<AppRouter>['goal']['delete'];
type CreateGoalContributionInput = inferRouterInputs<AppRouter>['goalContribution']['create'];
type UpdateGoalContributionInput = inferRouterInputs<AppRouter>['goalContribution']['update'];
type DeleteGoalContributionInput = inferRouterInputs<AppRouter>['goalContribution']['delete'];

export const goalListQueryKey = ['goals', 'list'];
export const goalContributionsQueryKey = (goalId: string) =>
  ['goals', 'contributions', goalId] as const;

export function useGoals() {
  return useQuery({
    queryKey: goalListQueryKey,
    queryFn: () => trpc.goal.list.query(),
  });
}

export function useGoalContributionLists(goalIds: string[]) {
  return useQueries({
    queries: goalIds.map((goalId) => ({
      queryKey: goalContributionsQueryKey(goalId),
      queryFn: () => trpc.goalContribution.list.query({ goalId }),
    })),
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

export function useCreateGoalContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGoalContributionInput) => trpc.goalContribution.create.mutate(input),
    onSuccess: () => invalidateGoalData(queryClient),
  });
}

export function useUpdateGoalContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateGoalContributionInput) => trpc.goalContribution.update.mutate(input),
    onSuccess: () => invalidateGoalData(queryClient),
  });
}

export function useDeleteGoalContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteGoalContributionInput) => trpc.goalContribution.delete.mutate(input),
    onSuccess: () => invalidateGoalData(queryClient),
  });
}

function invalidateGoals(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: goalListQueryKey });
}

// Contribution changes move earmarked Money between Accounts and Goals, so
// saved amounts and Account allocation must refresh together.
function invalidateGoalData(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: goalListQueryKey }),
    queryClient.invalidateQueries({ queryKey: ['goals', 'contributions'] }),
    queryClient.invalidateQueries({ queryKey: accountsListQueryKey }),
  ]);
}
