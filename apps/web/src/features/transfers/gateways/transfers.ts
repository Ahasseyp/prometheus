import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';
import { invalidateTransactionData } from '@/features/transactions/gateways/transactions.js';

export type Transfer = inferRouterOutputs<AppRouter>['transfer']['get'];
type CreateTransferInput = inferRouterInputs<AppRouter>['transfer']['create'];
type UpdateTransferInput = inferRouterInputs<AppRouter>['transfer']['update'];
type DeleteTransferInput = inferRouterInputs<AppRouter>['transfer']['delete'];

const transferGetQueryKey = ['transfers', 'get'];

export function useTransfer(id: string | undefined) {
  return useQuery({
    queryKey: [...transferGetQueryKey, id],
    queryFn: () => trpc.transfer.get.query({ id: id! }),
    enabled: id !== undefined,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTransferInput) => trpc.transfer.create.mutate(input),
    onSuccess: () => {
      void invalidateTransactionData(queryClient);
    },
  });
}

export function useUpdateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTransferInput) => trpc.transfer.update.mutate(input),
    onSuccess: () => {
      void invalidateTransactionData(queryClient);
    },
  });
}

export function useDeleteTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteTransferInput) => trpc.transfer.delete.mutate(input),
    onSuccess: () => {
      void invalidateTransactionData(queryClient);
    },
  });
}
