import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';
import { accountsListQueryKey } from '@/features/accounts/gateways/accounts.js';

export type TransactionListOutput = inferRouterOutputs<AppRouter>['transaction']['list'];
export type Transaction = TransactionListOutput[number];
type CreateTransactionInput = inferRouterInputs<AppRouter>['transaction']['create'];

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
      void queryClient.invalidateQueries({ queryKey: transactionsListQueryKey });
      // Balances are derived from the ledger server-side, so the overview's
      // account amounts change when a transaction is recorded.
      void queryClient.invalidateQueries({ queryKey: accountsListQueryKey });
    },
  });
}
