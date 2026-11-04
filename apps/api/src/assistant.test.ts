import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { Prisma } from '@prisma/client';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { getPrisma } from './prisma.js';
import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';
import { AccountType } from '@prometheus/domain';

describe.sequential('assistant procedures', () => {
  let server: Server;
  let client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  let fetchWithCookies: ReturnType<typeof createCookieJarFetch>;
  const createdUserIds: string[] = [];
  const createdHouseholdIds: string[] = [];
  let originalAllowInsecureCookies: string | undefined;
  let originalAllowRegistration: string | undefined;
  let originalAnthropicApiKey: string | undefined;

  beforeAll(async () => {
    originalAllowInsecureCookies = process.env.ALLOW_INSECURE_COOKIES;
    originalAllowRegistration = process.env.ALLOW_REGISTRATION;
    originalAnthropicApiKey = process.env.ANTHROPIC_API_KEY;
    process.env.ALLOW_INSECURE_COOKIES = 'true';
    process.env.ALLOW_REGISTRATION = 'true';
    delete process.env.ANTHROPIC_API_KEY;

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
    if (originalAnthropicApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalAnthropicApiKey;
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

  async function findSystemCategory(name: string) {
    const categories = await client.category.list.query();
    const category = categories.find((c) => c.name === name);
    expect(category).toBeDefined();
    return category!;
  }

  it('parses an expense into a resolved add-transaction command', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('assistant-expense'),
      'Secure-password-1'
    );
    if (context === null) return;

    const account = await client.account.create.mutate({
      name: 'Checking',
      type: AccountType.Checking,
      currency: 'USD',
    });
    const groceries = await findSystemCategory('Groceries');

    const result = await client.assistant.submitCommand.mutate({
      text: 'spent 300 pesos on groceries',
    });

    expect(result).toEqual({
      kind: 'add-transaction',
      type: 'expense',
      amount: '300',
      currency: 'MXN',
      accountId: account.id,
      accountName: 'Checking',
      categoryId: groceries.id,
      categoryName: 'Groceries',
      description: 'Groceries',
      date: expect.any(String),
    });
  });

  it('completes a clarification turn using the conversation history', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('assistant-followup'),
      'Secure-password-4'
    );
    if (context === null) return;

    const account = await client.account.create.mutate({
      name: 'Checking',
      type: AccountType.Checking,
      currency: 'USD',
    });
    const groceries = await findSystemCategory('Groceries');

    // Force the fake extractor so the clarification turn is deterministic.
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const first = await client.assistant.submitCommand.mutate({
        text: 'spent 300 pesos',
      });
      expect(first.kind).toBe('needs-clarification');
      if (first.kind !== 'needs-clarification') return;

      const followUp = await client.assistant.submitCommand.mutate({
        text: 'groceries',
        history: [
          { role: 'user', text: 'spent 300 pesos' },
          { role: 'assistant', text: first.question },
        ],
      });

      expect(followUp).toEqual({
        kind: 'add-transaction',
        type: 'expense',
        amount: '300',
        currency: 'MXN',
        accountId: account.id,
        accountName: 'Checking',
        categoryId: groceries.id,
        categoryName: 'Groceries',
        description: 'Groceries',
        date: expect.any(String),
      });
    } finally {
      if (anthropicKey !== undefined) process.env.ANTHROPIC_API_KEY = anthropicKey;
    }
  });

  it('returns a clarification card when the category is missing', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('assistant-clarify'),
      'Secure-password-2'
    );
    if (context === null) return;

    await client.account.create.mutate({
      name: 'Checking',
      type: AccountType.Checking,
      currency: 'USD',
    });

    const result = await client.assistant.submitCommand.mutate({
      text: 'spent 300 pesos on subscriptions',
    });

    expect(result.kind).toBe('needs-clarification');
    if (result.kind !== 'needs-clarification') return;
    expect(result.missing).toContain('category');
    expect(result.question).toContain('category');
    expect(result.options).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'category' })])
    );
  });

  it('parses a transfer into a resolved add-transfer command', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('assistant-transfer'),
      'Secure-password-3'
    );
    if (context === null) return;

    const checking = await client.account.create.mutate({
      name: 'Checking',
      type: AccountType.Checking,
      currency: 'USD',
    });
    const savings = await client.account.create.mutate({
      name: 'Savings',
      type: AccountType.Savings,
      currency: 'USD',
    });

    const result = await client.assistant.submitCommand.mutate({
      text: 'transfer 100 from checking to savings',
    });

    expect(result).toEqual({
      kind: 'add-transfer',
      amount: '100',
      currency: 'USD',
      fromAccountId: checking.id,
      fromAccountName: 'Checking',
      toAccountId: savings.id,
      toAccountName: 'Savings',
      description: 'Checking to Savings',
      date: expect.any(String),
    });
  });

  it('executes a resolved command, converting the parsed currency into the account currency', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('assistant-execute'),
      'Secure-password-5'
    );
    if (context === null) return;

    const account = await client.account.create.mutate({
      name: 'Checking',
      type: AccountType.Checking,
      currency: 'USD',
    });
    const groceries = await findSystemCategory('Groceries');

    // Seed a cached MXN -> USD rate for today so no provider call is needed.
    const prisma = getPrisma();
    await prisma.exchangeRate.upsert({
      where: {
        baseCurrency_quoteCurrency_date: {
          baseCurrency: 'MXN',
          quoteCurrency: 'USD',
          date: new Date(),
        },
      },
      update: { rate: new Prisma.Decimal('0.05'), provider: 'test' },
      create: {
        baseCurrency: 'MXN',
        quoteCurrency: 'USD',
        date: new Date(),
        rate: new Prisma.Decimal('0.05'),
        provider: 'test',
      },
    });

    const result = await client.assistant.executeCommand.mutate({
      kind: 'add-transaction',
      type: 'expense',
      amount: '300',
      currency: 'MXN',
      accountId: account.id,
      categoryId: groceries.id,
      date: new Date(),
      description: 'Groceries',
    });

    if (!('accountName' in result)) throw new Error('expected a transaction response');
    expect(result.amount).toBe('15.00');
    expect(result.accountName).toBe('Checking');
    expect(result.categoryName).toBe('Groceries');
  });

  it('executes a transfer command between same-currency accounts', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('assistant-execute-transfer'),
      'Secure-password-6'
    );
    if (context === null) return;

    const checking = await client.account.create.mutate({
      name: 'Checking',
      type: AccountType.Checking,
      currency: 'USD',
    });
    const savings = await client.account.create.mutate({
      name: 'Savings',
      type: AccountType.Savings,
      currency: 'USD',
    });

    const result = await client.assistant.executeCommand.mutate({
      kind: 'add-transfer',
      amount: '100',
      currency: 'USD',
      fromAccountId: checking.id,
      toAccountId: savings.id,
      date: new Date(),
    });

    if (!('sourceTransaction' in result)) throw new Error('expected a transfer response');
    expect(result.sourceTransaction.amount).toBe('100.00');
    expect(result.sourceTransaction.accountName).toBe('Checking');
    expect(result.destinationTransaction.accountName).toBe('Savings');
  });
});
