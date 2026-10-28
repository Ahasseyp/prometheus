import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';
import { invalidateTransactionData } from '@/features/transactions/gateways/transactions.js';

export type Transfer = inferRouterOutputs<AppRouter>['transfer']['get'];
type CreateTransferInput = inferRouterInputs<AppRouter>['transfer']['create'];

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTransferInput) => trpc.transfer.create.mutate(input),
    onSuccess: () => {
      void invalidateTransactionData(queryClient);
    },
  });
}
