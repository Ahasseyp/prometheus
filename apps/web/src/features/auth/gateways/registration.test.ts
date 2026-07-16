import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  createFailingRegistrationClient,
  createMockRegistrationClient,
} from '@/test/registration-client.js';
import { createQueryClientWrapper } from '@/test/providers.js';
import { server } from '@/test/server.js';

import { createRegistrationGateway, registrationGateway } from './registration.js';
import type { RegisterOutput } from './registration.js';

const successfulUser: RegisterOutput = {
  ok: true,
  user: {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    email: 'user@example.com',
    name: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

describe('registration gateway', () => {
  it('returns the created user on success', async () => {
    const gateway = createRegistrationGateway(createMockRegistrationClient(successfulUser));
    const { result } = renderHook(() => gateway.useRegister(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({ email: 'user@example.com', password: 'Secure-password-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(successfulUser);
  });

  it('surfaces errors when the mutation fails', async () => {
    const gateway = createRegistrationGateway(
      createFailingRegistrationClient(new Error('network error'))
    );
    const { result } = renderHook(() => gateway.useRegister(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({ email: 'user@example.com', password: 'Secure-password-1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('calls registration through the tRPC network boundary', async () => {
    server.use(
      http.post('/api/trpc/registration.register', () => {
        return HttpResponse.json({ result: { data: successfulUser } });
      })
    );

    const { result } = renderHook(() => registrationGateway.useRegister(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({ email: 'user@example.com', password: 'Secure-password-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(successfulUser);
  });
});
