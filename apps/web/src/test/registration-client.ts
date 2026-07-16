import type { RegistrationClient, RegisterOutput } from '@/features/auth/gateways/registration.js';

export function createMockRegistrationClient(response: RegisterOutput): RegistrationClient {
  return {
    register: () => Promise.resolve(response),
  };
}

export function createFailingRegistrationClient(error: Error): RegistrationClient {
  return {
    register: () => Promise.reject(error),
  };
}
