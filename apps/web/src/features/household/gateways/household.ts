import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type HouseholdMeOutput = inferRouterOutputs<AppRouter>['household']['me'];
type CreateHouseholdInput = inferRouterInputs<AppRouter>['household']['create'];
type UpdateReportingCurrencyInput =
  inferRouterInputs<AppRouter>['household']['updateReportingCurrency'];
export type CreateHouseholdOutput = inferRouterOutputs<AppRouter>['household']['create'];

export function useHouseholdMe() {
  return useQuery({
    queryKey: ['household', 'me'],
    queryFn: () => trpc.household.me.query(),
  });
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateHouseholdInput) => trpc.household.create.mutate(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['household', 'me'] });
    },
  });
}

export function useUpdateReportingCurrency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateReportingCurrencyInput) =>
      trpc.household.updateReportingCurrency.mutate(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['household', 'me'] });
      void queryClient.invalidateQueries({ queryKey: ['reporting'] });
    },
  });
}
