import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { createQueryClientWrapper } from '@/test/providers.js';
import { server } from '@/test/server.js';

import { createHealthGateway, healthGateway, type HealthStatus } from './health.js';

function createClient(response: HealthStatus) {
  return {
    query: () => Promise.resolve(response),
  };
}

function createFailingClient(error: Error) {
  return {
    query: () => Promise.reject(error),
  };
}

describe('health gateway', () => {
  it('returns the backend health status', async () => {
    const gateway = createHealthGateway(createClient({ status: 'ok' }));
    const { result } = renderHook(() => gateway.useHealth(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ status: 'ok' });
  });

  it('surfaces errors when the backend is unreachable', async () => {
    const gateway = createHealthGateway(createFailingClient(new Error('network error')));
    const { result } = renderHook(() => gateway.useHealth(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('fetches health through the tRPC network boundary', async () => {
    server.use(
      http.get('/api/trpc/health', () => {
        return HttpResponse.json({ result: { data: { status: 'ok' } } });
      })
    );

    const { result } = renderHook(() => healthGateway.useHealth(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ status: 'ok' });
  });
});
