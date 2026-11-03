import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type RecurringTransactionListOutput =
  inferRouterOutputs<AppRouter>['recurringTransaction']['list'];
export type RecurringTransaction = RecurringTransactionListOutput[number];
type CreateRecurringTransactionInput =
  inferRouterInputs<AppRouter>['recurringTransaction']['create'];

const recurringTransactionsListQueryKey = ['recurringTransactions', 'list'];

export function useRecurringTransactions() {
  return useQuery({
    queryKey: recurringTransactionsListQueryKey,
    queryFn: () => trpc.recurringTransaction.list.query(),
  });
}

export function useCreateRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRecurringTransactionInput) =>
      trpc.recurringTransaction.create.mutate(input),
    onSuccess: () => {
      void invalidateRecurringTransactionsData(queryClient);
    },
  });
}

export function invalidateRecurringTransactionsData(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: recurringTransactionsListQueryKey });
}
