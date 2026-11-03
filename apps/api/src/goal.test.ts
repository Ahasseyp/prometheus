import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';

describe.sequential('goal procedures', () => {
  let server: Server;
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
          resolve(void 0);
        }
      });
    });
  });

  async function registerAndCreateHousehold(email: string, password: string) {
    const registerResponse = await client.registration.register.mutate({
      email,
      password,
    });
    expect(registerResponse.ok).toBe(true);
    if (!registerResponse.ok) return null;

    createdUserIds.push(registerResponse.user.id);

    const householdResponse = await client.household.create.mutate({
      name: 'Test Household',
      reportingCurrency: 'USD',
    });
    expect(householdResponse.ok).toBe(true);
    if (!householdResponse.ok) return null;

    createdHouseholdIds.push(householdResponse.household.id);
    return { user: registerResponse.user, household: householdResponse.household };
  }

  it('creates, lists, gets, updates, and deletes a Goal', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('goal-crud-1'),
      'Secure-password-1'
    );
    if (context === null) return;

    const deadline = new Date('2027-06-30T00:00:00.000Z');
    const goal = await client.goal.create.mutate({
      name: 'Emergency Fund',
      target: '1000.00',
      currency: 'USD',
      deadline,
    });

    expect(goal.householdId).toBe(context.household.id);
    expect(goal.name).toBe('Emergency Fund');
    expect(goal.target).toBe('1000.00');
    expect(goal.currency).toBe('USD');
    expect(goal.deadline).toBe(deadline.toISOString());

    const fetched = await client.goal.get.query({ id: goal.id });
    expect(fetched.id).toBe(goal.id);

    const list = await client.goal.list.query();
    expect(list.some((g) => g.id === goal.id)).toBe(true);

    const updated = await client.goal.update.mutate({
      id: goal.id,
      name: 'Big Emergency Fund',
      target: '2500.50',
      deadline: new Date('2028-01-15T00:00:00.000Z'),
    });
    expect(updated.name).toBe('Big Emergency Fund');
    expect(updated.target).toBe('2500.50');
    expect(updated.currency).toBe('USD');

    const refetched = await client.goal.get.query({ id: goal.id });
    expect(refetched.target).toBe('2500.50');

    const deleted = await client.goal.delete.mutate({ id: goal.id });
    expect(deleted.ok).toBe(true);
    await expect(client.goal.get.query({ id: goal.id })).rejects.toThrow();
  });

  it('rejects invalid names, targets, currencies, and deadlines', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('goal-invalid-1'),
      'Secure-password-2'
    );
    if (context === null) return;

    const deadline = new Date('2027-06-30T00:00:00.000Z');
    const base = { name: 'Vacation', target: '500', currency: 'USD', deadline };

    await expect(client.goal.create.mutate({ ...base, name: '' })).rejects.toThrow();
    await expect(client.goal.create.mutate({ ...base, name: '   ' })).rejects.toThrow();
    await expect(client.goal.create.mutate({ ...base, target: '0' })).rejects.toThrow();
    await expect(client.goal.create.mutate({ ...base, target: '-10' })).rejects.toThrow();
    await expect(client.goal.create.mutate({ ...base, target: 'abc' })).rejects.toThrow();
    await expect(client.goal.create.mutate({ ...base, currency: 'XXX' })).rejects.toThrow();
    await expect(
      client.goal.create.mutate({ ...base, deadline: 'not-a-date' as unknown as Date })
    ).rejects.toThrow();
  });

  it('keeps the Currency fixed after creation', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('goal-currency-1'),
      'Secure-password-3'
    );
    if (context === null) return;

    const goal = await client.goal.create.mutate({
      name: 'EUR Goal',
      target: '100',
      currency: 'EUR',
      deadline: new Date('2027-01-01T00:00:00.000Z'),
    });
    expect(goal.currency).toBe('EUR');

    const updated = await client.goal.update.mutate({ id: goal.id, name: 'Renamed' });
    expect(updated.currency).toBe('EUR');
  });

  it('rejects access to Goals outside the household', async () => {
    const firstContext = await registerAndCreateHousehold(
      makeTestEmail('goal-isolation-1'),
      'Secure-password-4'
    );
    if (firstContext === null) return;

    const goal = await client.goal.create.mutate({
      name: 'Isolated',
      target: '100',
      currency: 'USD',
      deadline: new Date('2027-01-01T00:00:00.000Z'),
    });

    await registerAndCreateHousehold(makeTestEmail('goal-isolation-2'), 'Secure-password-5');

    await expect(client.goal.get.query({ id: goal.id })).rejects.toThrow();
    await expect(client.goal.update.mutate({ id: goal.id, name: 'Hijack' })).rejects.toThrow();
    await expect(client.goal.delete.mutate({ id: goal.id })).rejects.toThrow();

    const list = await client.goal.list.query();
    expect(list.find((g) => g.id === goal.id)).toBeUndefined();
  });
});
