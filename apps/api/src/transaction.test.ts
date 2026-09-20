import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';
import { AccountType, TransactionType } from '@prometheus/domain';

describe.sequential('transaction procedures', () => {
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

  async function createUsdAccount(name: string) {
    return client.account.create.mutate({ name, type: AccountType.Checking, currency: 'USD' });
  }

  async function findSystemCategory(name: string) {
    const categories = await client.category.list.query();
    const category = categories.find((c) => c.name === name);
    expect(category).toBeDefined();
    return category!;
  }

  it('creates an expense transaction with amount, account, date, category, and description', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('txn-create-1'),
      'Secure-password-1'
    );
    if (context === null) return;

    const account = await createUsdAccount('Checking');
    const groceries = await findSystemCategory('Groceries');

    const transaction = await client.transaction.create.mutate({
      type: TransactionType.Expense,
      amount: '42.50',
      accountId: account.id,
      categoryId: groceries.id,
      date: new Date('2026-08-15T00:00:00.000Z'),
      description: 'Weekly groceries',
    });

    expect(transaction.type).toBe(TransactionType.Expense);
    expect(transaction.amount).toBe('42.50');
    expect(transaction.accountId).toBe(account.id);
    expect(transaction.categoryId).toBe(groceries.id);
    expect(transaction.description).toBe('Weekly groceries');
    expect(transaction.householdId).toBe(context.household.id);
    expect(new Date(transaction.date).toISOString()).toBe('2026-08-15T00:00:00.000Z');
  });

  it('creates an income transaction and reflects it in the account balance', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('txn-income-1'),
      'Secure-password-2'
    );
    if (context === null) return;

    const account = await createUsdAccount('Checking');
    const salary = await findSystemCategory('Salary');

    await client.transaction.create.mutate({
      type: TransactionType.Income,
      amount: '1000',
      accountId: account.id,
      categoryId: salary.id,
      date: new Date('2026-08-01T00:00:00.000Z'),
    });

    const fetched = await client.account.get.query({ id: account.id });
    expect(fetched.balance).toBe('1000.00');
  });

  it('rejects a non-positive amount and an amount with too many decimal places', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('txn-amount-1'),
      'Secure-password-3'
    );
    if (context === null) return;

    const account = await createUsdAccount('Checking');
    const groceries = await findSystemCategory('Groceries');

    await expect(
      client.transaction.create.mutate({
        type: TransactionType.Expense,
        amount: '-5.00',
        accountId: account.id,
        categoryId: groceries.id,
        date: new Date('2026-08-15T00:00:00.000Z'),
      })
    ).rejects.toThrow();

    await expect(
      client.transaction.create.mutate({
        type: TransactionType.Expense,
        amount: '0',
        accountId: account.id,
        categoryId: groceries.id,
        date: new Date('2026-08-15T00:00:00.000Z'),
      })
    ).rejects.toThrow();

    await expect(
      client.transaction.create.mutate({
        type: TransactionType.Expense,
        amount: '1.005',
        accountId: account.id,
        categoryId: groceries.id,
        date: new Date('2026-08-15T00:00:00.000Z'),
      })
    ).rejects.toThrow();
  });

  it('rejects a category whose type does not match the transaction type', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('txn-mismatch-1'),
      'Secure-password-4'
    );
    if (context === null) return;

    const account = await createUsdAccount('Checking');
    const salary = await findSystemCategory('Salary');

    await expect(
      client.transaction.create.mutate({
        type: TransactionType.Expense,
        amount: '10.00',
        accountId: account.id,
        categoryId: salary.id,
        date: new Date('2026-08-15T00:00:00.000Z'),
      })
    ).rejects.toThrow();
  });

  it('edits a transaction', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('txn-update-1'),
      'Secure-password-5'
    );
    if (context === null) return;

    const account = await createUsdAccount('Checking');
    const groceries = await findSystemCategory('Groceries');
    const dining = await findSystemCategory('Dining');

    const created = await client.transaction.create.mutate({
      type: TransactionType.Expense,
      amount: '20.00',
      accountId: account.id,
      categoryId: groceries.id,
      date: new Date('2026-08-15T00:00:00.000Z'),
      description: 'Groceries',
    });

    const updated = await client.transaction.update.mutate({
      id: created.id,
      amount: '25.75',
      categoryId: dining.id,
      date: new Date('2026-08-16T00:00:00.000Z'),
      description: 'Lunch',
    });

    expect(updated.amount).toBe('25.75');
    expect(updated.categoryId).toBe(dining.id);
    expect(updated.description).toBe('Lunch');
    expect(new Date(updated.date).toISOString()).toBe('2026-08-16T00:00:00.000Z');
  });

  it('deletes a transaction', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('txn-delete-1'),
      'Secure-password-6'
    );
    if (context === null) return;

    const account = await createUsdAccount('Checking');
    const groceries = await findSystemCategory('Groceries');

    const created = await client.transaction.create.mutate({
      type: TransactionType.Expense,
      amount: '20.00',
      accountId: account.id,
      categoryId: groceries.id,
      date: new Date('2026-08-15T00:00:00.000Z'),
    });

    const deleted = await client.transaction.delete.mutate({ id: created.id });
    expect(deleted.ok).toBe(true);

    await expect(client.transaction.get.query({ id: created.id })).rejects.toThrow();
  });

  it('rejects moving a transaction to a lower-exponent currency without a new amount', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('txn-currency-1'),
      'Secure-password-11'
    );
    if (context === null) return;

    const usdAccount = await createUsdAccount('USD Checking');
    const jpyAccount = await client.account.create.mutate({
      name: 'Yen Wallet',
      type: AccountType.Cash,
      currency: 'JPY',
    });
    const groceries = await findSystemCategory('Groceries');

    const created = await client.transaction.create.mutate({
      type: TransactionType.Expense,
      amount: '4.50',
      accountId: usdAccount.id,
      categoryId: groceries.id,
      date: new Date('2026-08-15T00:00:00.000Z'),
    });

    // 450 minor units is 4.50 in USD but cannot be represented in 0dp JPY.
    await expect(
      client.transaction.update.mutate({ id: created.id, accountId: jpyAccount.id })
    ).rejects.toThrow();
  });

  it('allows moving a transaction between same-exponent currencies', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('txn-currency-2'),
      'Secure-password-12'
    );
    if (context === null) return;

    const usdAccount = await createUsdAccount('USD Checking');
    const mxnAccount = await client.account.create.mutate({
      name: 'Peso Checking',
      type: AccountType.Checking,
      currency: 'MXN',
    });
    const groceries = await findSystemCategory('Groceries');

    const created = await client.transaction.create.mutate({
      type: TransactionType.Expense,
      amount: '4.50',
      accountId: usdAccount.id,
      categoryId: groceries.id,
      date: new Date('2026-08-15T00:00:00.000Z'),
    });

    const moved = await client.transaction.update.mutate({
      id: created.id,
      accountId: mxnAccount.id,
    });
    expect(moved.accountId).toBe(mxnAccount.id);
    expect(moved.amount).toBe('4.50');
  });

  it('allows moving a transaction with an explicit amount valid for the new currency', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('txn-currency-3'),
      'Secure-password-13'
    );
    if (context === null) return;

    const usdAccount = await createUsdAccount('USD Checking');
    const jpyAccount = await client.account.create.mutate({
      name: 'Yen Wallet',
      type: AccountType.Cash,
      currency: 'JPY',
    });
    const groceries = await findSystemCategory('Groceries');

    const created = await client.transaction.create.mutate({
      type: TransactionType.Expense,
      amount: '4.50',
      accountId: usdAccount.id,
      categoryId: groceries.id,
      date: new Date('2026-08-15T00:00:00.000Z'),
    });

    // An explicit amount is validated against the new account's currency.
    await expect(
      client.transaction.update.mutate({
        id: created.id,
        accountId: jpyAccount.id,
        amount: '4.50',
      })
    ).rejects.toThrow();

    const moved = await client.transaction.update.mutate({
      id: created.id,
      accountId: jpyAccount.id,
      amount: '500',
    });
    expect(moved.accountId).toBe(jpyAccount.id);
    expect(moved.amount).toBe('500');
  });

  it('filters the transaction list by account and date range', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('txn-filter-1'),
      'Secure-password-7'
    );
    if (context === null) return;

    const checking = await createUsdAccount('Checking');
    const savings = await client.account.create.mutate({
      name: 'Savings',
      type: AccountType.Savings,
      currency: 'USD',
    });
    const groceries = await findSystemCategory('Groceries');
    const salary = await findSystemCategory('Salary');

    await client.transaction.create.mutate({
      type: TransactionType.Expense,
      amount: '10.00',
      accountId: checking.id,
      categoryId: groceries.id,
      date: new Date('2026-01-10T00:00:00.000Z'),
      description: 'January expense',
    });
    await client.transaction.create.mutate({
      type: TransactionType.Expense,
      amount: '20.00',
      accountId: checking.id,
      categoryId: groceries.id,
      date: new Date('2026-02-10T00:00:00.000Z'),
      description: 'February expense',
    });
    await client.transaction.create.mutate({
      type: TransactionType.Income,
      amount: '100.00',
      accountId: savings.id,
      categoryId: salary.id,
      date: new Date('2026-02-15T00:00:00.000Z'),
      description: 'February income',
    });

    const all = await client.transaction.list.query({});
    expect(all).toHaveLength(3);

    const checkingOnly = await client.transaction.list.query({ accountId: checking.id });
    expect(checkingOnly).toHaveLength(2);
    expect(checkingOnly.every((t) => t.accountId === checking.id)).toBe(true);

    const februaryOnly = await client.transaction.list.query({
      from: new Date('2026-02-01T00:00:00.000Z'),
      to: new Date('2026-02-28T23:59:59.999Z'),
    });
    expect(februaryOnly).toHaveLength(2);
    expect(februaryOnly.map((t) => t.description).sort()).toEqual([
      'February expense',
      'February income',
    ]);

    const checkingInJanuary = await client.transaction.list.query({
      accountId: checking.id,
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.999Z'),
    });
    expect(checkingInJanuary).toHaveLength(1);
    expect(checkingInJanuary[0].description).toBe('January expense');
  });

  it('rejects transaction creation without a household', async () => {
    const email = makeTestEmail('txn-no-household-1');
    const registerResponse = await client.registration.register.mutate({
      email,
      password: 'Secure-password-8',
    });
    expect(registerResponse.ok).toBe(true);
    if (!registerResponse.ok) return;

    createdUserIds.push(registerResponse.user.id);

    await expect(
      client.transaction.create.mutate({
        type: TransactionType.Expense,
        amount: '10.00',
        accountId: crypto.randomUUID(),
        categoryId: crypto.randomUUID(),
        date: new Date('2026-08-15T00:00:00.000Z'),
      })
    ).rejects.toThrow();
  });

  it('rejects access to transactions outside the household', async () => {
    const firstContext = await registerAndCreateHousehold(
      makeTestEmail('txn-isolation-1'),
      'Secure-password-9'
    );
    if (firstContext === null) return;

    const account = await createUsdAccount('Isolated Checking');
    const groceries = await findSystemCategory('Groceries');

    const created = await client.transaction.create.mutate({
      type: TransactionType.Expense,
      amount: '10.00',
      accountId: account.id,
      categoryId: groceries.id,
      date: new Date('2026-08-15T00:00:00.000Z'),
    });

    const secondContext = await registerAndCreateHousehold(
      makeTestEmail('txn-isolation-2'),
      'Secure-password-10'
    );
    if (secondContext === null) return;

    await expect(client.transaction.get.query({ id: created.id })).rejects.toThrow();
    await expect(
      client.transaction.update.mutate({ id: created.id, amount: '999.00' })
    ).rejects.toThrow();
    await expect(client.transaction.delete.mutate({ id: created.id })).rejects.toThrow();

    // The other household's transactions are invisible in the list as well.
    const list = await client.transaction.list.query({});
    expect(list.every((t) => t.householdId === secondContext.household.id)).toBe(true);
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

    await expect(freshClient.transaction.list.query({})).rejects.toThrow();
  });
});
