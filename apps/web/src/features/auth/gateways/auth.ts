import { useMutation, useQuery } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

type LoginInput = inferRouterInputs<AppRouter>['auth']['login'];
export type LoginOutput = inferRouterOutputs<AppRouter>['auth']['login'];
export type MeOutput = inferRouterOutputs<AppRouter>['auth']['me'];

export type AuthClient = {
  login(input: LoginInput): Promise<LoginOutput>;
  logout(): Promise<{ ok: true }>;
  me(): Promise<MeOutput>;
};

const defaultClient: AuthClient = {
  login: (input) => trpc.auth.login.mutate(input),
  logout: () => trpc.auth.logout.mutate(),
  me: () => trpc.auth.me.query(),
};

export function createAuthGateway(client: AuthClient = defaultClient) {
  function useLogin() {
    return useMutation({
      mutationFn: (input: LoginInput) => client.login(input),
    });
  }

  function useLogout() {
    return useMutation({
      mutationFn: () => client.logout(),
    });
  }

  function useMe() {
    return useQuery({
      queryKey: ['auth', 'me'],
      queryFn: () => client.me(),
    });
  }

  return { useLogin, useLogout, useMe };
}

export const authGateway = createAuthGateway();
export const useLogin = authGateway.useLogin;
export const useLogout = authGateway.useLogout;
export const useMe = authGateway.useMe;
