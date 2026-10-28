import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { getPrisma } from './prisma.js';
import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';
import { AccountType, TransactionType } from '@prometheus/domain';

describe.sequential('transfer procedures', () => {
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
    // Scoped to the dates this file seeds: test files share the test database
    // and run in parallel, so a broad MXN/USD delete would race other suites.
    await getPrisma().exchangeRate.deleteMany({
      where: {
        baseCurrency: 'MXN',
        quoteCurrency: 'USD',
        date: {
          in: [
            new Date('2026-10-21T00:00:00.000Z'),
            new Date('2026-10-22T00:00:00.000Z'),
            new Date('2026-10-23T00:00:00.000Z'),
          ],
        },
      },
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

  async function createAccount(name: string, currency: string) {
    return client.account.create.mutate({
      name,
      type: AccountType.Checking,
      currency: currency as 'USD',
    });
  }

  it('creates an equal-amount same-currency Transfer as a linked Transaction pair', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('transfer-same-ccy'),
      'Secure-password-1'
    );
    if (context === null) return;

    const source = await createAccount('Checking', 'USD');
    const destination = await createAccount('Savings', 'USD');

    const transfer = await client.transfer.create.mutate({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: '100.00',
      date: new Date('2026-10-20T00:00:00.000Z'),
      description: 'Move to savings',
    });

    expect(transfer.exchangeRate).toBeNull();
    expect(transfer.sourceTransaction.type).toBe(TransactionType.Expense);
    expect(transfer.sourceTransaction.amount).toBe('100.00');
    expect(transfer.sourceTransaction.accountId).toBe(source.id);
    expect(transfer.sourceTransaction.categoryId).toBeNull();
    expect(transfer.sourceTransaction.description).toBe('Move to savings');
    expect(transfer.destinationTransaction.type).toBe(TransactionType.Income);
    expect(transfer.destinationTransaction.amount).toBe('100.00');
    expect(transfer.destinationTransaction.accountId).toBe(destination.id);
    expect(transfer.destinationTransaction.categoryId).toBeNull();

    const fetched = await client.transfer.get.query({ id: transfer.id });
    expect(fetched.sourceTransaction.id).toBe(transfer.sourceTransaction.id);
    expect(fetched.destinationTransaction.id).toBe(transfer.destinationTransaction.id);

    const sourceTransactions = await client.transaction.list.query({ accountId: source.id });
    const sourceSide = sourceTransactions.find((t) => t.id === transfer.sourceTransaction.id);
    expect(sourceSide).toBeDefined();
    expect(sourceSide?.transfer).toEqual({
      id: transfer.id,
      counterpartyAccountId: destination.id,
      counterpartyAccountName: 'Savings',
    });

    const destinationTransactions = await client.transaction.list.query({
      accountId: destination.id,
    });
    const destinationSide = destinationTransactions.find(
      (t) => t.id === transfer.destinationTransaction.id
    );
    expect(destinationSide).toBeDefined();
    expect(destinationSide?.transfer?.counterpartyAccountId).toBe(source.id);
    expect(destinationSide?.transfer?.counterpartyAccountName).toBe('Checking');
  });

  it('creates a cross-currency Transfer with source and destination amounts and a direct Exchange Rate', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('transfer-cross-ccy'),
      'Secure-password-1'
    );
    if (context === null) return;

    await getPrisma().exchangeRate.create({
      data: {
        baseCurrency: 'MXN',
        quoteCurrency: 'USD',
        date: new Date('2026-10-21T00:00:00.000Z'),
        rate: '0.054',
        provider: 'test',
      },
    });

    const source = await createAccount('Cash MXN', 'MXN');
    const destination = await createAccount('Checking', 'USD');

    const transfer = await client.transfer.create.mutate({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: '1000.00',
      destinationAmount: '54.00',
      exchangeRate: '0.054',
      date: new Date('2026-10-21T00:00:00.000Z'),
    });

    expect(transfer.exchangeRate).toBe('0.054');
    expect(transfer.sourceTransaction.amount).toBe('1000.00');
    expect(transfer.sourceTransaction.type).toBe(TransactionType.Expense);
    expect(transfer.sourceTransaction.accountCurrency).toBe('MXN');
    expect(transfer.sourceTransaction.reportingCurrency).toBe('USD');
    expect(transfer.sourceTransaction.exchangeRate).toBe('0.054');
    expect(transfer.destinationTransaction.amount).toBe('54.00');
    expect(transfer.destinationTransaction.type).toBe(TransactionType.Income);
    expect(transfer.destinationTransaction.accountCurrency).toBe('USD');
  });

  it('rejects a cross-currency Transfer whose Exchange Rate does not match the amounts', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('transfer-incoherent'),
      'Secure-password-1'
    );
    if (context === null) return;

    const source = await createAccount('Cash MXN', 'MXN');
    const destination = await createAccount('Checking', 'USD');

    await expect(
      client.transfer.create.mutate({
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: '1000.00',
        destinationAmount: '54.00',
        exchangeRate: '0.05',
        date: new Date('2026-10-21T00:00:00.000Z'),
      })
    ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });
  });

  it('rejects a cross-currency Transfer without a destination amount', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('transfer-missing-dest'),
      'Secure-password-1'
    );
    if (context === null) return;

    const source = await createAccount('Cash MXN', 'MXN');
    const destination = await createAccount('Checking', 'USD');

    await expect(
      client.transfer.create.mutate({
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: '1000.00',
        exchangeRate: '0.054',
        date: new Date('2026-10-21T00:00:00.000Z'),
      })
    ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });
  });

  it('rejects a Transfer whose source and destination Accounts are the same', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('transfer-same-account'),
      'Secure-password-1'
    );
    if (context === null) return;

    const account = await createAccount('Checking', 'USD');

    await expect(
      client.transfer.create.mutate({
        sourceAccountId: account.id,
        destinationAccountId: account.id,
        amount: '100.00',
        date: new Date('2026-10-20T00:00:00.000Z'),
      })
    ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });
  });

  it('rejects a non-positive Transfer amount', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('transfer-zero-amount'),
      'Secure-password-1'
    );
    if (context === null) return;

    const source = await createAccount('Checking', 'USD');
    const destination = await createAccount('Savings', 'USD');

    await expect(
      client.transfer.create.mutate({
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: '0',
        date: new Date('2026-10-20T00:00:00.000Z'),
      })
    ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });
  });

  it('rejects a Transfer to an Account outside the Household', async () => {
    const first = await registerAndCreateHousehold(
      makeTestEmail('transfer-hh-1'),
      'Secure-password-1'
    );
    const second = await registerAndCreateHousehold(
      makeTestEmail('transfer-hh-2'),
      'Secure-password-1'
    );
    if (first === null || second === null) return;

    const source = await createAccount('Checking', 'USD');
    const foreignAccount = await createAccount('Foreign Savings', 'USD');

    // Registering the second Household replaced the session cookie; log back
    // into the first Household before attempting the Transfer.
    const loginResponse = await client.auth.login.mutate({
      email: first.user.email,
      password: 'Secure-password-1',
    });
    expect(loginResponse.ok).toBe(true);

    await expect(
      client.transfer.create.mutate({
        sourceAccountId: source.id,
        destinationAccountId: foreignAccount.id,
        amount: '100.00',
        date: new Date('2026-10-20T00:00:00.000Z'),
      })
    ).rejects.toMatchObject({ data: { code: 'NOT_FOUND' } });
  });

  it('updates a Transfer amount across both linked Transactions', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('transfer-update-amount'),
      'Secure-password-1'
    );
    if (context === null) return;

    const source = await createAccount('Checking', 'USD');
    const destination = await createAccount('Savings', 'USD');
    const transfer = await client.transfer.create.mutate({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: '100.00',
      date: new Date('2026-10-20T00:00:00.000Z'),
      description: 'Move to savings',
    });

    const updated = await client.transfer.update.mutate({
      id: transfer.id,
      amount: '250.00',
      description: 'Bigger move',
    });

    expect(updated.id).toBe(transfer.id);
    expect(updated.sourceTransaction.amount).toBe('250.00');
    expect(updated.sourceTransaction.description).toBe('Bigger move');
    expect(updated.destinationTransaction.amount).toBe('250.00');
    expect(updated.destinationTransaction.description).toBe('Bigger move');
    expect(updated.sourceTransaction.id).toBe(transfer.sourceTransaction.id);
    expect(updated.destinationTransaction.id).toBe(transfer.destinationTransaction.id);
  });

  it('updates a cross-currency Transfer Exchange Rate and amounts together', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('transfer-update-ccy'),
      'Secure-password-1'
    );
    if (context === null) return;

    await getPrisma().exchangeRate.create({
      data: {
        baseCurrency: 'MXN',
        quoteCurrency: 'USD',
        date: new Date('2026-10-22T00:00:00.000Z'),
        rate: '0.054',
        provider: 'test',
      },
    });

    const source = await createAccount('Cash MXN', 'MXN');
    const destination = await createAccount('Checking', 'USD');
    const transfer = await client.transfer.create.mutate({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: '1000.00',
      destinationAmount: '54.00',
      exchangeRate: '0.054',
      date: new Date('2026-10-22T00:00:00.000Z'),
    });

    const updated = await client.transfer.update.mutate({
      id: transfer.id,
      amount: '2000.00',
      destinationAmount: '110.00',
      exchangeRate: '0.055',
    });

    expect(updated.exchangeRate).toBe('0.055');
    expect(updated.sourceTransaction.amount).toBe('2000.00');
    expect(updated.destinationTransaction.amount).toBe('110.00');
  });

  it('moves a Transfer to new Accounts while preserving the pair', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('transfer-update-accounts'),
      'Secure-password-1'
    );
    if (context === null) return;

    const source = await createAccount('Checking', 'USD');
    const destination = await createAccount('Savings', 'USD');
    const newSource = await createAccount('Cash', 'USD');
    const transfer = await client.transfer.create.mutate({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: '100.00',
      date: new Date('2026-10-20T00:00:00.000Z'),
    });

    const updated = await client.transfer.update.mutate({
      id: transfer.id,
      sourceAccountId: newSource.id,
    });

    expect(updated.sourceTransaction.accountId).toBe(newSource.id);
    expect(updated.sourceTransaction.amount).toBe('100.00');
    expect(updated.destinationTransaction.accountId).toBe(destination.id);
  });

  it('rejects an incompatible edit and leaves both original Transactions unchanged', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('transfer-update-rollback'),
      'Secure-password-1'
    );
    if (context === null) return;

    await getPrisma().exchangeRate.create({
      data: {
        baseCurrency: 'MXN',
        quoteCurrency: 'USD',
        date: new Date('2026-10-23T00:00:00.000Z'),
        rate: '0.054',
        provider: 'test',
      },
    });

    const source = await createAccount('Cash MXN', 'MXN');
    const destination = await createAccount('Checking', 'USD');
    const transfer = await client.transfer.create.mutate({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: '1000.00',
      destinationAmount: '54.00',
      exchangeRate: '0.054',
      date: new Date('2026-10-23T00:00:00.000Z'),
    });

    await expect(
      client.transfer.update.mutate({
        id: transfer.id,
        exchangeRate: '0.04',
      })
    ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });

    const unchanged = await client.transfer.get.query({ id: transfer.id });
    expect(unchanged.sourceTransaction.amount).toBe('1000.00');
    expect(unchanged.destinationTransaction.amount).toBe('54.00');
    expect(unchanged.exchangeRate).toBe('0.054');
  });

  it('rejects an Exchange Rate supplied for a same-currency Transfer update', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('transfer-update-rate-same-ccy'),
      'Secure-password-1'
    );
    if (context === null) return;

    const source = await createAccount('Checking', 'USD');
    const destination = await createAccount('Savings', 'USD');
    const transfer = await client.transfer.create.mutate({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: '100.00',
      date: new Date('2026-10-20T00:00:00.000Z'),
    });

    await expect(
      client.transfer.update.mutate({
        id: transfer.id,
        exchangeRate: '1.2',
      })
    ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });

    const unchanged = await client.transfer.get.query({ id: transfer.id });
    expect(unchanged.exchangeRate).toBeNull();
  });

  it('rejects updates from outside the Household', async () => {
    const first = await registerAndCreateHousehold(
      makeTestEmail('transfer-update-hh-1'),
      'Secure-password-1'
    );
    const source = await createAccount('Checking', 'USD');
    const destination = await createAccount('Savings', 'USD');
    const transfer = await client.transfer.create.mutate({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: '100.00',
      date: new Date('2026-10-20T00:00:00.000Z'),
    });

    await registerAndCreateHousehold(makeTestEmail('transfer-update-hh-2'), 'Secure-password-1');
    if (first === null) return;

    await expect(
      client.transfer.update.mutate({ id: transfer.id, amount: '200.00' })
    ).rejects.toMatchObject({ data: { code: 'NOT_FOUND' } });
    await expect(client.transfer.delete.mutate({ id: transfer.id })).rejects.toMatchObject({
      data: { code: 'NOT_FOUND' },
    });
  });

  it('deletes both linked Transactions with the Transfer', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('transfer-delete'),
      'Secure-password-1'
    );
    if (context === null) return;

    const source = await createAccount('Checking', 'USD');
    const destination = await createAccount('Savings', 'USD');
    const transfer = await client.transfer.create.mutate({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: '100.00',
      date: new Date('2026-10-20T00:00:00.000Z'),
    });

    const deleted = await client.transfer.delete.mutate({ id: transfer.id });
    expect(deleted.ok).toBe(true);

    await expect(client.transfer.get.query({ id: transfer.id })).rejects.toMatchObject({
      data: { code: 'NOT_FOUND' },
    });

    const sourceTransactions = await client.transaction.list.query({ accountId: source.id });
    expect(sourceTransactions.find((t) => t.id === transfer.sourceTransaction.id)).toBeUndefined();
    const destinationTransactions = await client.transaction.list.query({
      accountId: destination.id,
    });
    expect(
      destinationTransactions.find((t) => t.id === transfer.destinationTransaction.id)
    ).toBeUndefined();
  });

  it('rejects ordinary Transaction edits and deletes that would break a pair', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('transfer-txn-guard'),
      'Secure-password-1'
    );
    if (context === null) return;

    const source = await createAccount('Checking', 'USD');
    const destination = await createAccount('Savings', 'USD');
    const transfer = await client.transfer.create.mutate({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: '100.00',
      date: new Date('2026-10-20T00:00:00.000Z'),
    });

    await expect(
      client.transaction.update.mutate({
        id: transfer.sourceTransaction.id,
        amount: '1.00',
      })
    ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });
    await expect(
      client.transaction.delete.mutate({ id: transfer.destinationTransaction.id })
    ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });

    const unchanged = await client.transfer.get.query({ id: transfer.id });
    expect(unchanged.sourceTransaction.amount).toBe('100.00');
  });
});
