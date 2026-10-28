import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';
import { accountsListQueryKey } from '@/features/accounts/gateways/accounts.js';
import { reportingSummaryQueryKey } from '@/features/reporting/gateways/reporting.js';

export type TransactionListOutput = inferRouterOutputs<AppRouter>['transaction']['list'];
export type Transaction = TransactionListOutput[number];
type CreateTransactionInput = inferRouterInputs<AppRouter>['transaction']['create'];
type UpdateTransactionInput = inferRouterInputs<AppRouter>['transaction']['update'];
type DeleteTransactionInput = inferRouterInputs<AppRouter>['transaction']['delete'];

export interface TransactionFilters {
  accountId?: string;
  from?: string;
  to?: string;
}

const transactionsListQueryKey = ['transactions', 'list'];

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: [...transactionsListQueryKey, filters],
    queryFn: () =>
      trpc.transaction.list.query({
        accountId: filters.accountId,
        from: filters.from === undefined ? undefined : new Date(`${filters.from}T00:00:00`),
        to: filters.to === undefined ? undefined : new Date(`${filters.to}T23:59:59.999`),
      }),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTransactionInput) => trpc.transaction.create.mutate(input),
    onSuccess: () => {
      void invalidateTransactionData(queryClient);
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTransactionInput) => trpc.transaction.update.mutate(input),
    onSuccess: () => {
      void invalidateTransactionData(queryClient);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteTransactionInput) => trpc.transaction.delete.mutate(input),
    onSuccess: () => {
      void invalidateTransactionData(queryClient);
    },
  });
}

// Transactions change the transactions list and the account balances shown on
// the overview page (derived from the ledger server-side). Transfers reuse
// this invalidation because they create, update, and delete Transactions too.
export function invalidateTransactionData(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: transactionsListQueryKey }),
    queryClient.invalidateQueries({ queryKey: accountsListQueryKey }),
    queryClient.invalidateQueries({ queryKey: reportingSummaryQueryKey }),
  ]);
}
