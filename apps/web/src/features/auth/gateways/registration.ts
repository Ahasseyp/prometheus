import { useMutation } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

type RegisterInput = inferRouterInputs<AppRouter>['registration']['register'];
export type RegisterOutput = inferRouterOutputs<AppRouter>['registration']['register'];

export type RegistrationClient = {
  register(input: RegisterInput): Promise<RegisterOutput>;
};

const defaultClient: RegistrationClient = {
  register: (input) => trpc.registration.register.mutate(input),
};

export function createRegistrationGateway(client: RegistrationClient = defaultClient) {
  function useRegister() {
    return useMutation({
      mutationFn: (input: RegisterInput) => client.register(input),
    });
  }

  return { useRegister };
}

export const registrationGateway = createRegistrationGateway();
export const useRegister = registrationGateway.useRegister;
