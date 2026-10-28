import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type BudgetListOutput = inferRouterOutputs<AppRouter>['budget']['list'];
export type Budget = BudgetListOutput[number];
export type BudgetProgress = inferRouterOutputs<AppRouter>['budget']['progress'];
type CreateBudgetInput = inferRouterInputs<AppRouter>['budget']['create'];
type UpdateBudgetInput = inferRouterInputs<AppRouter>['budget']['update'];
type DeleteBudgetInput = inferRouterInputs<AppRouter>['budget']['delete'];

export const budgetListQueryKey = ['budgets', 'list'];
export const budgetProgressQueryKey = (budgetId: string) =>
  ['budgets', 'progress', budgetId] as const;

export function useBudgets() {
  return useQuery({
    queryKey: budgetListQueryKey,
    queryFn: () => trpc.budget.list.query(),
  });
}

export function useBudgetProgress(budgetId: string) {
  return useQuery({
    queryKey: budgetProgressQueryKey(budgetId),
    queryFn: () => trpc.budget.progress.query({ id: budgetId }),
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBudgetInput) => trpc.budget.create.mutate(input),
    onSuccess: () => invalidateBudgets(queryClient),
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateBudgetInput) => trpc.budget.update.mutate(input),
    onSuccess: () => invalidateBudgets(queryClient),
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteBudgetInput) => trpc.budget.delete.mutate(input),
    onSuccess: () => invalidateBudgets(queryClient),
  });
}

function invalidateBudgets(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: budgetListQueryKey }),
    queryClient.invalidateQueries({ queryKey: ['budgets', 'progress'] }),
  ]);
}
