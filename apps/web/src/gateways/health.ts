import { useQuery } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from './trpc.js';

type RouterOutput = inferRouterOutputs<AppRouter>;

export type HealthStatus = RouterOutput['health'];

export type HealthClient = {
  query(): Promise<HealthStatus>;
};

export const healthKeys = {
  all: ['health'] as const,
};

const defaultClient: HealthClient = {
  query: () => trpc.health.query(),
};

export function createHealthGateway(client: HealthClient = defaultClient) {
  function useHealth() {
    return useQuery({
      queryKey: healthKeys.all,
      queryFn: () => client.query(),
    });
  }

  return { useHealth };
}

export const healthGateway = createHealthGateway();
export const useHealth = healthGateway.useHealth;
