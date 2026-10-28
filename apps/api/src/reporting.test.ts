import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { AccountType, TransactionType } from '@prometheus/domain';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { getPrisma } from './prisma.js';
import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';

describe.sequential('reporting summary procedure', () => {
  let server: Server;
  let client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  const createdUserIds: string[] = [];
  const createdHouseholdIds: string[] = [];
  let originalAllowInsecureCookies: string | undefined;
  let originalAllowRegistration: string | undefined;

  beforeAll(async () => {
    originalAllowInsecureCookies = process.env.ALLOW_INSECURE_COOKIES;
    originalAllowRegistration = process.env.ALLOW_REGISTRATION;
    process.env.ALLOW_INSECURE_COOKIES = 'true';
    process.env.ALLOW_REGISTRATION = 'true';
    const { server: testServer, url } = await startTestServer();
    server = testServer;
    client = createTRPCProxyClient<AppRouter>({
      links: [httpBatchLink({ url: `${url}/api/trpc`, fetch: createCookieJarFetch() })],
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
    await getPrisma().exchangeRate.deleteMany({
      where: { baseCurrency: 'MXN', quoteCurrency: 'USD' },
    });
    await cleanupTestData({ userIds: createdUserIds, householdIds: createdHouseholdIds });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  async function createHousehold() {
    const registration = await client.registration.register.mutate({
      email: makeTestEmail('reporting-summary'),
      password: 'Secure-password-1',
    });
    expect(registration.ok).toBe(true);
    if (!registration.ok) return;
    createdUserIds.push(registration.user.id);
    const household = await client.household.create.mutate({
      name: 'Reporting Household',
      reportingCurrency: 'USD',
    });
    expect(household.ok).toBe(true);
    if (household.ok) {
      createdHouseholdIds.push(household.household.id);
    }
  }

  async function addIncome(accountId: string, amount: string) {
    const categories = await client.category.list.query();
    const salary = categories.find((category) => category.name === 'Salary');
    expect(salary).toBeDefined();
    await client.transaction.create.mutate({
      type: TransactionType.Income,
      amount,
      accountId,
      categoryId: salary!.id,
      date: new Date('2026-10-26T00:00:00.000Z'),
    });
  }

  it('converts account balances and subtracts Loans from net worth', async () => {
    await createHousehold();
    const usdAccount = await client.account.create.mutate({
      name: 'USD Checking',
      type: AccountType.Checking,
      currency: 'USD',
    });
    const mxnAccount = await client.account.create.mutate({
      name: 'MXN Checking',
      type: AccountType.Checking,
      currency: 'MXN',
    });
    const loan = await client.account.create.mutate({
      name: 'Loan',
      type: AccountType.Loan,
      currency: 'USD',
    });
    await getPrisma().exchangeRate.createMany({
      data: [
        {
          baseCurrency: 'MXN',
          quoteCurrency: 'USD',
          date: new Date('2026-10-25T00:00:00.000Z'),
          rate: '0.04',
          provider: 'test',
        },
        {
          baseCurrency: 'MXN',
          quoteCurrency: 'USD',
          date: new Date('2026-10-26T00:00:00.000Z'),
          rate: '0.05',
          provider: 'test',
        },
      ],
    });
    await addIncome(usdAccount.id, '100');
    await addIncome(mxnAccount.id, '1000');
    await addIncome(loan.id, '200');

    const summary = await client.reporting.summary.query();

    expect(summary.reportingCurrency).toBe('USD');
    expect(summary.netWorth).toBe('-50.00');
    expect(summary.accounts).toEqual([
      expect.objectContaining({
        id: usdAccount.id,
        balance: '100.00',
        convertedBalance: '100.00',
        exchangeRate: '1',
      }),
      expect.objectContaining({
        id: mxnAccount.id,
        balance: '1000.00',
        convertedBalance: '50.00',
        exchangeRate: '0.05',
      }),
      expect.objectContaining({
        id: loan.id,
        balance: '200.00',
        convertedBalance: '200.00',
        exchangeRate: '1',
      }),
    ]);
  });

  it('returns unavailable conversion state when an account has no cached rate', async () => {
    await createHousehold();
    const account = await client.account.create.mutate({
      name: 'GBP Checking',
      type: AccountType.Checking,
      currency: 'GBP',
    });

    const summary = await client.reporting.summary.query();

    expect(summary.reportingCurrency).toBe('USD');
    expect(summary.netWorth).toBeNull();
    expect(summary.accounts).toEqual([
      expect.objectContaining({
        id: account.id,
        balance: '0.00',
        convertedBalance: null,
        exchangeRate: null,
      }),
    ]);
  });
});
