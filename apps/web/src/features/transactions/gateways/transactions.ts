import { useQuery } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type TransactionListOutput = inferRouterOutputs<AppRouter>['transaction']['list'];
export type Transaction = TransactionListOutput[number];

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
