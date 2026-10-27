import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { getPrisma } from './prisma.js';
import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';

describe.sequential('exchange rate refresh procedure', () => {
  let server: Server;
  let client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  const createdUserIds: string[] = [];
  let originalAllowInsecureCookies: string | undefined;
  let originalAllowRegistration: string | undefined;
  let originalExchangeRateApiKey: string | undefined;

  beforeAll(async () => {
    originalAllowInsecureCookies = process.env.ALLOW_INSECURE_COOKIES;
    originalAllowRegistration = process.env.ALLOW_REGISTRATION;
    originalExchangeRateApiKey = process.env.EXCHANGE_RATE_API_KEY;
    process.env.ALLOW_INSECURE_COOKIES = 'true';
    process.env.ALLOW_REGISTRATION = 'true';
    delete process.env.EXCHANGE_RATE_API_KEY;
    const { server: testServer, url } = await startTestServer();
    server = testServer;
    const fetchWithCookies = createCookieJarFetch();
    client = createTRPCProxyClient<AppRouter>({
      links: [httpBatchLink({ url: `${url}/api/trpc`, fetch: fetchWithCookies })],
    });

    const registration = await client.registration.register.mutate({
      email: makeTestEmail('exchange-rate-refresh'),
      password: 'Secure-password-1',
    });
    expect(registration.ok).toBe(true);
    if (registration.ok) {
      createdUserIds.push(registration.user.id);
    }
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    if (originalAllowInsecureCookies === undefined) {
      delete process.env.ALLOW_INSECURE_COOKIES;
    } else {
      process.env.ALLOW_INSECURE_COOKIES = originalAllowInsecureCookies;
    }
    if (originalAllowRegistration === undefined) {
      delete process.env.ALLOW_REGISTRATION;
    } else {
      process.env.ALLOW_REGISTRATION = originalAllowRegistration;
    }
    if (originalExchangeRateApiKey === undefined) {
      delete process.env.EXCHANGE_RATE_API_KEY;
    } else {
      process.env.EXCHANGE_RATE_API_KEY = originalExchangeRateApiKey;
    }
    await getPrisma().exchangeRate.deleteMany({
      where: { baseCurrency: 'USD', quoteCurrency: 'MXN' },
    });
    await cleanupTestData({ userIds: createdUserIds, householdIds: [] });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('fetches and returns a dated rate from Frankfurter', async () => {
    const serverFetch = globalThis.fetch;
    const providerFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ base: 'USD', quote: 'MXN', date: '2026-10-26', rate: 18.45 }))
      );
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request, init?: RequestInit) =>
        String(input).startsWith('https://api.frankfurter.dev/')
          ? providerFetch(input, init)
          : serverFetch(input, init)
      )
    );

    const response = await client.exchangeRate.refresh.mutate({
      baseCurrency: 'USD',
      quoteCurrency: 'MXN',
      date: new Date('2026-10-26T00:00:00.000Z'),
    });

    expect(response).toEqual({
      baseCurrency: 'USD',
      quoteCurrency: 'MXN',
      date: '2026-10-26T00:00:00.000Z',
      rate: '18.45',
      provider: 'frankfurter',
    });
    expect(providerFetch).toHaveBeenCalledOnce();
  });

  it('uses ExchangeRate-API first when it is configured', async () => {
    process.env.EXCHANGE_RATE_API_KEY = 'test-key';
    const serverFetch = globalThis.fetch;
    const providerFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ result: 'success', conversion_rates: { MXN: 18.47 } }))
      );
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request, init?: RequestInit) =>
        String(input).startsWith('https://v6.exchangerate-api.com/')
          ? providerFetch(input, init)
          : serverFetch(input, init)
      )
    );

    const response = await client.exchangeRate.refresh.mutate({
      baseCurrency: 'USD',
      quoteCurrency: 'MXN',
      date: new Date('2026-10-26T00:00:00.000Z'),
    });

    expect(response.rate).toBe('18.47');
    expect(response.provider).toBe('exchange-rate-api');
    expect(providerFetch).toHaveBeenCalledOnce();
  });

  it('uses Frankfurter when ExchangeRate-API fails', async () => {
    process.env.EXCHANGE_RATE_API_KEY = 'test-key';
    const serverFetch = globalThis.fetch;
    const providerFetch = vi.fn((input: string | URL | Request) => {
      if (String(input).startsWith('https://v6.exchangerate-api.com/')) {
        return Promise.reject(new Error('Primary provider unavailable'));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ base: 'USD', quote: 'MXN', date: '2026-10-26', rate: 18.46 }))
      );
    });
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request, init?: RequestInit) =>
        String(input).startsWith('http://') ? serverFetch(input, init) : providerFetch(input)
      )
    );

    const response = await client.exchangeRate.refresh.mutate({
      baseCurrency: 'USD',
      quoteCurrency: 'MXN',
      date: new Date('2026-10-26T00:00:00.000Z'),
    });

    expect(response.rate).toBe('18.46');
    expect(response.provider).toBe('frankfurter');
    expect(providerFetch).toHaveBeenCalledTimes(2);
  });

  it('uses the cached rate when both providers are unavailable', async () => {
    process.env.EXCHANGE_RATE_API_KEY = 'test-key';
    const serverFetch = globalThis.fetch;
    const providerFetch = vi.fn().mockRejectedValue(new Error('Provider unavailable'));
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request, init?: RequestInit) =>
        String(input).startsWith('http://') ? serverFetch(input, init) : providerFetch(input, init)
      )
    );

    const response = await client.exchangeRate.refresh.mutate({
      baseCurrency: 'USD',
      quoteCurrency: 'MXN',
      date: new Date('2026-10-27T00:00:00.000Z'),
    });

    expect(response).toEqual({
      baseCurrency: 'USD',
      quoteCurrency: 'MXN',
      date: '2026-10-26T00:00:00.000Z',
      rate: '18.46',
      provider: 'frankfurter',
    });
    expect(providerFetch).toHaveBeenCalledTimes(2);
  });
});
