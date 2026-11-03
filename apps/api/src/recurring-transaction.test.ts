import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';
import { AccountType, TransactionType } from '@prometheus/domain';

describe.sequential('recurring transaction procedures', () => {
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

  async function createUsdAccount(name: string) {
    return client.account.create.mutate({ name, type: AccountType.Checking, currency: 'USD' });
  }

  async function findSystemCategory(name: string) {
    const categories = await client.category.list.query();
    const category = categories.find((c) => c.name === name);
    expect(category).toBeDefined();
    return category!;
  }

  it('creates a recurring transaction and lists it with a computed next date', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('recurring-create-1'),
      'Secure-password-1'
    );
    if (context === null) return;

    const account = await createUsdAccount('Checking');
    const groceries = await findSystemCategory('Groceries');

    const created = await client.recurringTransaction.create.mutate({
      type: TransactionType.Expense,
      amount: '42.50',
      accountId: account.id,
      categoryId: groceries.id,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      period: 'month',
      interval: 1,
      description: 'Rent',
    });

    expect(created.type).toBe('expense');
    expect(created.amount).toBe('42.50');
    expect(created.accountId).toBe(account.id);
    expect(created.categoryId).toBe(groceries.id);
    expect(created.period).toBe('month');
    expect(created.interval).toBe(1);
    expect(created.accountName).toBe('Checking');
    expect(created.accountCurrency).toBe('USD');
    expect(created.categoryName).toBe('Groceries');

    const list = await client.recurringTransaction.list.query();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
    expect(list[0].nextDate).toBeDefined();
  });

  it('rejects a mismatched category type', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('recurring-mismatch-1'),
      'Secure-password-2'
    );
    if (context === null) return;

    const account = await createUsdAccount('Checking');
    const salary = await findSystemCategory('Salary');

    await expect(
      client.recurringTransaction.create.mutate({
        type: TransactionType.Expense,
        amount: '10.00',
        accountId: account.id,
        categoryId: salary.id,
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        period: 'month',
        interval: 1,
      })
    ).rejects.toThrow();
  });

  it('lists only recurring transactions in the household', async () => {
    const firstContext = await registerAndCreateHousehold(
      makeTestEmail('recurring-isolation-1'),
      'Secure-password-3'
    );
    if (firstContext === null) return;

    const account = await createUsdAccount('Checking');
    const groceries = await findSystemCategory('Groceries');
    await client.recurringTransaction.create.mutate({
      type: TransactionType.Expense,
      amount: '10.00',
      accountId: account.id,
      categoryId: groceries.id,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      period: 'month',
      interval: 1,
    });

    await registerAndCreateHousehold(makeTestEmail('recurring-isolation-2'), 'Secure-password-4');

    const list = await client.recurringTransaction.list.query();
    expect(list).toHaveLength(0);
  });
});
