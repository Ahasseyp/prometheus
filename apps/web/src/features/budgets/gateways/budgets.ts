import { useQuery } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type BudgetListOutput = inferRouterOutputs<AppRouter>['budget']['list'];
export type Budget = BudgetListOutput[number];
export type BudgetProgress = inferRouterOutputs<AppRouter>['budget']['progress'];

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
