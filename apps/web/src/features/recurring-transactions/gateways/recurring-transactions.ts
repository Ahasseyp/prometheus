import { useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type RecurringTransactionListOutput =
  inferRouterOutputs<AppRouter>['recurringTransaction']['list'];
export type RecurringTransaction = RecurringTransactionListOutput[number];

const recurringTransactionsListQueryKey = ['recurringTransactions', 'list'];

export function useRecurringTransactions() {
  return useQuery({
    queryKey: recurringTransactionsListQueryKey,
    queryFn: () => trpc.recurringTransaction.list.query(),
  });
}

export function invalidateRecurringTransactionsData(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: recurringTransactionsListQueryKey });
}
