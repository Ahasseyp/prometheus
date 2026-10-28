import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';
import { getPrisma } from './prisma.js';
import { AccountType, TransactionType } from '@prometheus/domain';

// Progress is measured against the caller-provided "today" so the tests are
// deterministic no matter which day of the period they run on.
const TODAY = new Date('2026-10-15T12:00:00.000Z');
const THIS_MONTH = new Date('2026-10-10T00:00:00.000Z');
const LAST_MONTH = new Date('2026-09-10T00:00:00.000Z');
const TWO_MONTHS_AGO = new Date('2026-08-10T00:00:00.000Z');

describe.sequential('budget progress procedures', () => {
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

    // Stored historical rates so cross-currency Transactions can be created
    // offline (resolveTransactionExchangeRate reads the cache first).
    const prisma = getPrisma();
    for (const date of [THIS_MONTH, LAST_MONTH, TWO_MONTHS_AGO]) {
      await prisma.exchangeRate.upsert({
        where: {
          baseCurrency_quoteCurrency_date: {
            baseCurrency: 'EUR',
            quoteCurrency: 'USD',
            date,
          },
        },
        create: {
          baseCurrency: 'EUR',
          quoteCurrency: 'USD',
          date,
          rate: '1.2',
          provider: 'test',
        },
        update: {},
      });
    }
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
    const prisma = getPrisma();
    await prisma.exchangeRate.deleteMany({
      where: { baseCurrency: 'EUR', quoteCurrency: 'USD', provider: 'test' },
    });
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

  async function createExpenseCategory(name: string) {
    return client.category.create.mutate({
      name,
      type: TransactionType.Expense,
    });
  }

  async function createBudgetWith(
    name: string,
    categoryIds: string[],
    limit = '500',
    period: 'weekly' | 'monthly' | 'yearly' = 'monthly'
  ) {
    return client.budget.create.mutate({ name, limit, period, categoryIds });
  }

  function seedTransaction(accountId: string, categoryId: string, amount: string, date: Date) {
    return client.transaction.create.mutate({
      type: TransactionType.Expense,
      amount,
      accountId,
      categoryId,
      date,
    });
  }

  it('reports current-period spend converted at transaction-date rates', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('budget-progress-1'),
      'Secure-password-1'
    );
    if (context === null) return;

    const usdCategory = await createExpenseCategory('USD Spend');
    const eurCategory = await createExpenseCategory('EUR Spend');
    const budget = await createBudgetWith('Mixed', [usdCategory.id, eurCategory.id]);

    const usdAccount = await client.account.create.mutate({
      name: 'Checking',
      type: AccountType.Checking,
      currency: 'USD',
    });
    const eurAccount = await client.account.create.mutate({
      name: 'Euro Card',
      type: AccountType.CreditCard,
      currency: 'EUR',
    });

    await seedTransaction(usdAccount.id, usdCategory.id, '100.00', THIS_MONTH);
    const eurTransaction = await seedTransaction(
      eurAccount.id,
      eurCategory.id,
      '50.00',
      THIS_MONTH
    );
    // The stored transaction-date rate is used, not a current rate.
    expect(eurTransaction.reportingCurrency).toBe('USD');
    expect(eurTransaction.exchangeRate).toBe('1.2');

    const progress = await client.budget.progress.query({ id: budget.id, date: TODAY });

    expect(progress.currency).toBe('USD');
    expect(progress.limit).toBe('500.00');
    expect(progress.spent).toBe('160.00');
    expect(progress.rollover).toBe('0.00');
    expect(progress.available).toBe('500.00');
    expect(progress.remaining).toBe('340.00');
    expect(progress.period.start).toBe('2026-10-01T00:00:00.000Z');
    expect(progress.period.end).toBe('2026-11-01T00:00:00.000Z');
  });

  it('rolls unused amounts forward and never rolls overspending', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('budget-progress-2'),
      'Secure-password-2'
    );
    if (context === null) return;

    const underspentCategory = await createExpenseCategory('Underspent');
    const overspentCategory = await createExpenseCategory('Overspent');
    const underspent = await createBudgetWith('Underspent', [underspentCategory.id]);
    const overspent = await createBudgetWith('Overspent', [overspentCategory.id]);

    const account = await client.account.create.mutate({
      name: 'Checking',
      type: AccountType.Checking,
      currency: 'USD',
    });

    // Backdate both budgets so prior periods count as rollover windows.
    const prisma = getPrisma();
    for (const budget of [underspent, overspent]) {
      await prisma.budget.update({
        where: { id: budget.id },
        data: { createdAt: TWO_MONTHS_AGO },
      });
    }

    // Underspent budget: 100 of 500 last month, 100 of 500 the month before.
    await seedTransaction(account.id, underspentCategory.id, '100.00', LAST_MONTH);
    await seedTransaction(account.id, underspentCategory.id, '100.00', TWO_MONTHS_AGO);

    const underspentProgress = await client.budget.progress.query({
      id: underspent.id,
      date: TODAY,
    });
    expect(underspentProgress.rollover).toBe('800.00');
    expect(underspentProgress.available).toBe('1300.00');
    expect(underspentProgress.remaining).toBe('1300.00');

    // Overspent budget: 550 of 500 last month; overspending adds no rollover,
    // earlier underspend still carries forward.
    await seedTransaction(account.id, overspentCategory.id, '550.00', LAST_MONTH);
    await seedTransaction(account.id, overspentCategory.id, '400.00', TWO_MONTHS_AGO);

    const overspentProgress = await client.budget.progress.query({
      id: overspent.id,
      date: TODAY,
    });
    expect(overspentProgress.rollover).toBe('100.00');
    expect(overspentProgress.available).toBe('600.00');
  });

  it('counts only expense transactions in the current period for its categories', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('budget-progress-3'),
      'Secure-password-3'
    );
    if (context === null) return;

    const tracked = await createExpenseCategory('Tracked');
    const untracked = await createExpenseCategory('Untracked');
    const income = await client.category.create.mutate({
      name: 'Salary',
      type: TransactionType.Income,
    });
    const budget = await createBudgetWith('Tracked Budget', [tracked.id]);

    const account = await client.account.create.mutate({
      name: 'Checking',
      type: AccountType.Checking,
      currency: 'USD',
    });

    await seedTransaction(account.id, tracked.id, '100.00', THIS_MONTH);
    // Same period, wrong category.
    await seedTransaction(account.id, untracked.id, '50.00', THIS_MONTH);
    // Same category, wrong period.
    await seedTransaction(account.id, tracked.id, '75.00', LAST_MONTH);
    // Income never counts against a Budget.
    await client.transaction.create.mutate({
      type: TransactionType.Income,
      amount: '999.00',
      accountId: account.id,
      categoryId: income.id,
      date: THIS_MONTH,
    });

    const progress = await client.budget.progress.query({ id: budget.id, date: TODAY });
    expect(progress.spent).toBe('100.00');
    expect(progress.remaining).toBe('400.00');
  });

  it('measures weekly periods as Monday-starting weeks', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('budget-progress-4'),
      'Secure-password-4'
    );
    if (context === null) return;

    const category = await createExpenseCategory('Weekly');
    const budget = await createBudgetWith('Weekly', [category.id], '100', 'weekly');

    const account = await client.account.create.mutate({
      name: 'Checking',
      type: AccountType.Checking,
      currency: 'USD',
    });

    // 2026-10-15 is a Thursday. Its week starts Monday 2026-10-12.
    await seedTransaction(account.id, category.id, '40.00', new Date('2026-10-14T00:00:00.000Z'));
    await seedTransaction(account.id, category.id, '10.00', new Date('2026-10-11T00:00:00.000Z'));

    const progress = await client.budget.progress.query({ id: budget.id, date: TODAY });
    expect(progress.period.start).toBe('2026-10-12T00:00:00.000Z');
    expect(progress.period.end).toBe('2026-10-19T00:00:00.000Z');
    expect(progress.spent).toBe('40.00');
  });

  it('rejects progress when a transaction cannot be converted to the reporting currency', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('budget-progress-5'),
      'Secure-password-5'
    );
    if (context === null) return;

    const category = await createExpenseCategory('Legacy');
    const budget = await createBudgetWith('Legacy', [category.id]);

    const eurAccount = await client.account.create.mutate({
      name: 'Euro Card',
      type: AccountType.CreditCard,
      currency: 'EUR',
    });

    // A legacy Transaction with no stored reporting conversion.
    const prisma = getPrisma();
    await prisma.transaction.create({
      data: {
        id: crypto.randomUUID(),
        householdId: context.household.id,
        accountId: eurAccount.id,
        categoryId: category.id,
        type: 'EXPENSE',
        amount: 1000n,
        date: THIS_MONTH,
      },
    });

    await expect(client.budget.progress.query({ id: budget.id, date: TODAY })).rejects.toThrow();
  });

  it('rejects progress for a budget outside the household', async () => {
    const firstContext = await registerAndCreateHousehold(
      makeTestEmail('budget-progress-6'),
      'Secure-password-6'
    );
    if (firstContext === null) return;

    const category = await createExpenseCategory('Isolated');
    const budget = await createBudgetWith('Isolated', [category.id]);

    await registerAndCreateHousehold(makeTestEmail('budget-progress-7'), 'Secure-password-7');

    await expect(client.budget.progress.query({ id: budget.id, date: TODAY })).rejects.toThrow();
  });
});
