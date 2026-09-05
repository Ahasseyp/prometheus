import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';
import { AccountType } from '@prometheus/domain';

describe.sequential('account procedures', () => {
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

  it('creates an account for the authenticated household', async () => {
    const email = makeTestEmail('account-create-1');
    const context = await registerAndCreateHousehold(email, 'Secure-password-1');
    if (context === null) return;

    const account = await client.account.create.mutate({
      name: 'Primary Checking',
      type: AccountType.Checking,
      currency: 'USD',
    });

    expect(account.name).toBe('Primary Checking');
    expect(account.type).toBe(AccountType.Checking);
    expect(account.currency).toBe('USD');
    expect(account.householdId).toBe(context.household.id);
    expect(account.balance).toBe('0');
  });

  it('lists accounts scoped to the household', async () => {
    const email = makeTestEmail('account-list-1');
    const context = await registerAndCreateHousehold(email, 'Secure-password-2');
    if (context === null) return;

    await client.account.create.mutate({
      name: 'Savings',
      type: AccountType.Savings,
      currency: 'USD',
    });
    await client.account.create.mutate({
      name: 'Credit Card',
      type: AccountType.CreditCard,
      currency: 'MXN',
    });

    const accounts = await client.account.list.query();

    expect(accounts).toHaveLength(2);
    expect(accounts.map((a) => a.name)).toContain('Savings');
    expect(accounts.map((a) => a.name)).toContain('Credit Card');
    expect(accounts.every((a) => a.householdId === context.household.id)).toBe(true);
  });

  it('gets a single account by id', async () => {
    const email = makeTestEmail('account-get-1');
    const context = await registerAndCreateHousehold(email, 'Secure-password-3');
    if (context === null) return;

    const created = await client.account.create.mutate({
      name: 'Cash Wallet',
      type: AccountType.Cash,
      currency: 'MXN',
    });

    const fetched = await client.account.get.query({ id: created.id });

    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe('Cash Wallet');
  });

  it('updates an account', async () => {
    const email = makeTestEmail('account-update-1');
    const context = await registerAndCreateHousehold(email, 'Secure-password-4');
    if (context === null) return;

    const created = await client.account.create.mutate({
      name: 'Old Name',
      type: AccountType.Checking,
      currency: 'USD',
    });

    const updated = await client.account.update.mutate({
      id: created.id,
      name: 'New Name',
      type: AccountType.Savings,
    });

    expect(updated.name).toBe('New Name');
    expect(updated.type).toBe(AccountType.Savings);
    // Account Currency is fixed after creation (ADR-0002).
    expect(updated.currency).toBe('USD');
  });

  it('deletes an account', async () => {
    const email = makeTestEmail('account-delete-1');
    const context = await registerAndCreateHousehold(email, 'Secure-password-5');
    if (context === null) return;

    const created = await client.account.create.mutate({
      name: 'To Delete',
      type: AccountType.Investment,
      currency: 'USD',
    });

    const deleted = await client.account.delete.mutate({ id: created.id });
    expect(deleted.ok).toBe(true);

    await expect(client.account.get.query({ id: created.id })).rejects.toThrow();
  });

  it('rejects account creation without a household', async () => {
    const email = makeTestEmail('account-no-household-1');
    const password = 'Secure-password-6';
    const registerResponse = await client.registration.register.mutate({ email, password });
    expect(registerResponse.ok).toBe(true);
    if (!registerResponse.ok) return;

    createdUserIds.push(registerResponse.user.id);

    await expect(
      client.account.create.mutate({
        name: 'Orphan Account',
        type: AccountType.Checking,
        currency: 'USD',
      })
    ).rejects.toThrow();
  });

  it('rejects access to accounts outside the household', async () => {
    const firstEmail = makeTestEmail('account-isolation-1');
    const firstContext = await registerAndCreateHousehold(firstEmail, 'Secure-password-7');
    if (firstContext === null) return;

    const created = await client.account.create.mutate({
      name: 'Isolated Account',
      type: AccountType.Loan,
      currency: 'USD',
    });

    const secondEmail = makeTestEmail('account-isolation-2');
    const secondContext = await registerAndCreateHousehold(secondEmail, 'Secure-password-8');
    if (secondContext === null) return;

    await expect(client.account.get.query({ id: created.id })).rejects.toThrow();
    await expect(
      client.account.update.mutate({ id: created.id, name: 'Hijacked' })
    ).rejects.toThrow();
    await expect(client.account.delete.mutate({ id: created.id })).rejects.toThrow();
  });

  it('rejects unauthenticated requests', async () => {
    const freshClient = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${serverUrl}/api/trpc`,
          fetch: createCookieJarFetch(),
        }),
      ],
    });

    await expect(
      freshClient.account.create.mutate({
        name: 'Unauthenticated',
        type: AccountType.Checking,
        currency: 'USD',
      })
    ).rejects.toThrow();
  });

  it('supports loan accounts', async () => {
    const email = makeTestEmail('account-loan-1');
    const context = await registerAndCreateHousehold(email, 'Secure-password-9');
    if (context === null) return;

    const account = await client.account.create.mutate({
      name: 'Car Loan',
      type: AccountType.Loan,
      currency: 'USD',
    });

    expect(account.type).toBe(AccountType.Loan);
  });
});
