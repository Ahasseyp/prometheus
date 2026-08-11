import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type AccountListOutput = inferRouterOutputs<AppRouter>['account']['list'];
export type Account = AccountListOutput[number];
type CreateAccountInput = inferRouterInputs<AppRouter>['account']['create'];
type UpdateAccountInput = inferRouterInputs<AppRouter>['account']['update'];
type DeleteAccountInput = inferRouterInputs<AppRouter>['account']['delete'];

const accountsListQueryKey = ['accounts', 'list'];

export function useAccounts() {
  return useQuery({
    queryKey: accountsListQueryKey,
    queryFn: () => trpc.account.list.query(),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAccountInput) => trpc.account.create.mutate(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountsListQueryKey });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAccountInput) => trpc.account.update.mutate(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountsListQueryKey });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteAccountInput) => trpc.account.delete.mutate(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountsListQueryKey });
    },
  });
}
