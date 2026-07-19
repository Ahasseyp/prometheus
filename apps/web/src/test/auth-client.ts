import type { AuthClient, LoginOutput, MeOutput } from '@/features/auth/gateways/auth.js';

export function createMockAuthClient(response: LoginOutput): AuthClient {
  return {
    login: () => Promise.resolve(response),
    logout: () => Promise.resolve({ ok: true as const }),
    me: () =>
      Promise.resolve({
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        email: 'user@example.com',
        name: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies MeOutput),
  };
}

export function createFailingAuthClient(error: Error): AuthClient {
  return {
    login: () => Promise.reject(error),
    logout: () => Promise.reject(error),
    me: () => Promise.reject(error),
  };
}
