import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { getPrisma } from './prisma.js';
import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';

describe.sequential('household creation procedure', () => {
  let server: Server;
  let serverUrl: string;
  let client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  let fetchWithCookies: ReturnType<typeof createCookieJarFetch>;
  const createdUserIds: string[] = [];
  const createdHouseholdIds: string[] = [];
  let originalAllowInsecureCookies: string | undefined;
  let originalAllowRegistration: string | undefined;

  beforeAll(async () => {
    originalAllowInsecureCookies = process.env.ALLOW_INSECURE_COOKIES;
    originalAllowRegistration = process.env.ALLOW_REGISTRATION;
    process.env.ALLOW_INSECURE_COOKIES = 'true';
    process.env.ALLOW_REGISTRATION = 'true';
    const { server: s, url } = await startTestServer();
    server = s;
    serverUrl = url;
    fetchWithCookies = createCookieJarFetch();
    client = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${url}/api/trpc`,
          fetch: fetchWithCookies,
        }),
      ],
    });
  });

  afterAll(async () => {
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
    await cleanupTestData({ userIds: createdUserIds, householdIds: createdHouseholdIds });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  });

  async function registerAndLogin(email: string, password: string) {
    const registerResponse = await client.registration.register.mutate({
      email,
      password,
    });
    expect(registerResponse.ok).toBe(true);
    if (!registerResponse.ok) return null;

    createdUserIds.push(registerResponse.user.id);

    return registerResponse.user;
  }

  it('creates a household and assigns the authenticated user as owner', async () => {
    const email = makeTestEmail('household-create-1');
    const password = 'Secure-password-1';
    const user = await registerAndLogin(email, password);
    if (user === null) return;

    const response = await client.household.create.mutate({
      name: 'My Household',
      reportingCurrency: 'USD',
    });

    expect(response.ok).toBe(true);
    if (!response.ok) return;

    expect(response.household.name).toBe('My Household');
    expect(response.household.reportingCurrency).toBe('USD');
    createdHouseholdIds.push(response.household.id);

    const membership = await getPrisma().householdMembership.findFirst({
      where: { householdId: response.household.id },
    });

    expect(membership).not.toBeNull();
    expect(membership?.userId).toBe(user.id);
    expect(membership?.role).toBe('OWNER');
  });

  it('rejects household creation when the user already has a household', async () => {
    const email = makeTestEmail('household-create-2');
    const password = 'Secure-password-2';
    const user = await registerAndLogin(email, password);
    if (user === null) return;

    const first = await client.household.create.mutate({
      name: 'First Household',
      reportingCurrency: 'MXN',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    createdHouseholdIds.push(first.household.id);

    const second = await client.household.create.mutate({
      name: 'Second Household',
      reportingCurrency: 'MXN',
    });

    expect(second).toEqual({ ok: false, error: 'user-already-has-household' });
  });

  it('returns the active household for the authenticated user', async () => {
    const email = makeTestEmail('household-me-1');
    const password = 'Secure-password-3';
    const user = await registerAndLogin(email, password);
    if (user === null) return;

    const createResponse = await client.household.create.mutate({
      name: 'My Household',
      reportingCurrency: 'USD',
    });
    expect(createResponse.ok).toBe(true);
    if (!createResponse.ok) return;
    createdHouseholdIds.push(createResponse.household.id);

    const meResponse = await client.household.me.query();

    expect(meResponse.household).toEqual({
      id: createResponse.household.id,
      name: createResponse.household.name,
      reportingCurrency: createResponse.household.reportingCurrency,
      role: 'OWNER',
    });
  });

  it('returns null when the authenticated user has no household', async () => {
    const email = makeTestEmail('household-me-2');
    const password = 'Secure-password-4';
    await registerAndLogin(email, password);

    const meResponse = await client.household.me.query();

    expect(meResponse.household).toBeNull();
  });

  it('rejects household creation for unauthenticated requests', async () => {
    const freshClient = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${serverUrl}/api/trpc`,
          fetch: createCookieJarFetch(),
        }),
      ],
    });

    await expect(
      freshClient.household.create.mutate({
        name: 'Unauthenticated Household',
        reportingCurrency: 'USD',
      })
    ).rejects.toThrow();
  });
});
