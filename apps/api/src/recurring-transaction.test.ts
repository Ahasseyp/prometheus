import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { AccountType, TransactionType } from '@prometheus/domain';

import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';
import { getPrisma } from './prisma.js';

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

  function startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  function daysAgo(days: number): Date {
    const today = startOfUtcDay(new Date());
    today.setUTCDate(today.getUTCDate() - days);
    return today;
  }

  function addDays(date: Date, days: number): Date {
    const next = startOfUtcDay(new Date(date));
    next.setUTCDate(next.getUTCDate() + days);
    return next;
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

  it('generates due transaction instances when listing recurring transactions', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('recurring-generate-1'),
      'Secure-password-5'
    );
    if (context === null) return;

    const account = await createUsdAccount('Checking');
    const groceries = await findSystemCategory('Groceries');
    const startDate = daysAgo(14);

    const created = await client.recurringTransaction.create.mutate({
      type: TransactionType.Expense,
      amount: '10.00',
      accountId: account.id,
      categoryId: groceries.id,
      startDate,
      period: 'week',
      interval: 1,
    });

    // Calling the list procedure triggers lazy generation.
    const list = await client.recurringTransaction.list.query();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
    expect(new Date(list[0].nextDate).getTime()).toBeGreaterThan(
      startOfUtcDay(new Date()).getTime()
    );

    const transactions = await client.transaction.list.query({
      from: startDate,
      to: daysAgo(0),
    });
    expect(transactions).toHaveLength(3);

    const expectedDates = [0, 7, 14].map((offset) => addDays(startDate, offset));
    expect(transactions.map((t) => new Date(t.date).getTime()).sort()).toEqual(
      expectedDates.map((d) => d.getTime()).sort()
    );
    for (const transaction of transactions) {
      expect(transaction.amount).toBe('10.00');
      expect(transaction.accountId).toBe(account.id);
      expect(transaction.categoryId).toBe(groceries.id);
    }
  });

  it('is idempotent when generating recurring transaction instances', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('recurring-idempotent-1'),
      'Secure-password-6'
    );
    if (context === null) return;

    const account = await createUsdAccount('Checking');
    const groceries = await findSystemCategory('Groceries');
    const startDate = daysAgo(7);

    await client.recurringTransaction.create.mutate({
      type: TransactionType.Expense,
      amount: '12.00',
      accountId: account.id,
      categoryId: groceries.id,
      startDate,
      period: 'week',
      interval: 1,
    });

    await client.recurringTransaction.list.query();
    const firstRun = await client.transaction.list.query({
      from: startDate,
      to: daysAgo(0),
    });

    await client.recurringTransaction.list.query();
    const secondRun = await client.transaction.list.query({
      from: startDate,
      to: daysAgo(0),
    });

    expect(secondRun).toHaveLength(firstRun.length);
    expect(secondRun.map((t) => t.id).sort()).toEqual(firstRun.map((t) => t.id).sort());
  });

  it('does not generate skipped occurrences', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('recurring-skip-1'),
      'Secure-password-7'
    );
    if (context === null) return;

    const account = await createUsdAccount('Checking');
    const groceries = await findSystemCategory('Groceries');
    const startDate = daysAgo(14);
    const skippedDate = addDays(startDate, 7);

    const created = await client.recurringTransaction.create.mutate({
      type: TransactionType.Expense,
      amount: '15.00',
      accountId: account.id,
      categoryId: groceries.id,
      startDate,
      period: 'week',
      interval: 1,
    });

    await getPrisma().skippedInstance.create({
      data: {
        recurringTransactionId: created.id,
        date: skippedDate,
      },
    });

    await client.recurringTransaction.list.query();

    const transactions = await client.transaction.list.query({
      from: startDate,
      to: daysAgo(0),
    });
    expect(transactions).toHaveLength(2);
    expect(transactions.some((t) => new Date(t.date).getTime() === skippedDate.getTime())).toBe(
      false
    );
  });

  it('records a skipped instance for the next upcoming occurrence', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('recurring-skip-next-1'),
      'Secure-password-8'
    );
    if (context === null) return;

    const account = await createUsdAccount('Checking');
    const groceries = await findSystemCategory('Groceries');
    const startDate = daysAgo(14);

    const created = await client.recurringTransaction.create.mutate({
      type: TransactionType.Expense,
      amount: '20.00',
      accountId: account.id,
      categoryId: groceries.id,
      startDate,
      period: 'week',
      interval: 1,
    });

    await client.recurringTransaction.list.query();
    const beforeSkip = await client.transaction.list.query({
      from: startDate,
      to: daysAgo(0),
    });
    expect(beforeSkip).toHaveLength(3);

    const skipResult = await client.recurringTransaction.skip.mutate({ id: created.id });
    expect(skipResult.skippedDate).toBeDefined();

    await client.recurringTransaction.list.query();
    const afterSkip = await client.transaction.list.query({
      from: startDate,
      to: daysAgo(0),
    });
    expect(afterSkip).toHaveLength(3);
    expect(
      afterSkip.some(
        (t) => new Date(t.date).getTime() === new Date(skipResult.skippedDate).getTime()
      )
    ).toBe(false);
  });

  it('is idempotent when skipping the same occurrence twice', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('recurring-skip-idempotent-1'),
      'Secure-password-9'
    );
    if (context === null) return;

    const account = await createUsdAccount('Checking');
    const groceries = await findSystemCategory('Groceries');
    const startDate = daysAgo(14);

    const created = await client.recurringTransaction.create.mutate({
      type: TransactionType.Expense,
      amount: '20.00',
      accountId: account.id,
      categoryId: groceries.id,
      startDate,
      period: 'week',
      interval: 1,
    });

    await client.recurringTransaction.list.query();
    const first = await client.recurringTransaction.skip.mutate({ id: created.id });
    const second = await client.recurringTransaction.skip.mutate({ id: created.id });

    expect(new Date(first.skippedDate).getTime()).toBe(new Date(second.skippedDate).getTime());
  });
});
