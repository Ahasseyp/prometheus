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
type UpdateRecurringTransactionInput =
  inferRouterInputs<AppRouter>['recurringTransaction']['update'];
type DeleteRecurringTransactionInput =
  inferRouterInputs<AppRouter>['recurringTransaction']['delete'];
type SkipRecurringTransactionInput = inferRouterInputs<AppRouter>['recurringTransaction']['skip'];

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

export function useUpdateRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateRecurringTransactionInput) =>
      trpc.recurringTransaction.update.mutate(input),
    onSuccess: () => {
      void invalidateRecurringTransactionsData(queryClient);
    },
  });
}

export function useDeleteRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteRecurringTransactionInput) =>
      trpc.recurringTransaction.delete.mutate(input),
    onSuccess: () => {
      void invalidateRecurringTransactionsData(queryClient);
    },
  });
}

export function useSkipRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SkipRecurringTransactionInput) =>
      trpc.recurringTransaction.skip.mutate(input),
    onSuccess: () => {
      void invalidateRecurringTransactionsData(queryClient);
    },
  });
}

export function invalidateRecurringTransactionsData(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: recurringTransactionsListQueryKey });
}
