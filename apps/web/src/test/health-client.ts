import type { HealthClient, HealthStatus } from '@/gateways/health.js';

export function createMockHealthClient(response: HealthStatus): HealthClient {
  return {
    query: () => Promise.resolve(response),
  };
}

export function createFailingHealthClient(error: Error): HealthClient {
  return {
    query: () => Promise.reject(error),
  };
}
