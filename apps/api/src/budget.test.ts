import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';
import { TransactionType } from '@prometheus/domain';

describe.sequential('budget procedures', () => {
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

  async function createExpenseCategory(name: string) {
    return client.category.create.mutate({
      name,
      type: TransactionType.Expense,
    });
  }

  it('creates a Budget with a limit, period, and multiple expense categories', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('budget-create-1'),
      'Secure-password-1'
    );
    if (context === null) return;

    const groceries = await createExpenseCategory('Groceries');
    const dining = await createExpenseCategory('Dining');

    const budget = await client.budget.create.mutate({
      name: 'Food',
      limit: '500.00',
      period: 'monthly',
      categoryIds: [groceries.id, dining.id],
    });

    expect(budget.householdId).toBe(context.household.id);
    expect(budget.name).toBe('Food');
    expect(budget.limit).toBe('500.00');
    expect(budget.period).toBe('monthly');
    expect(budget.categoryIds).toEqual(expect.arrayContaining([groceries.id, dining.id]));
    expect(budget.categoryIds.length).toBe(2);

    const fetched = await client.budget.get.query({ id: budget.id });
    expect(fetched.id).toBe(budget.id);

    const list = await client.budget.list.query();
    expect(list.some((b) => b.id === budget.id)).toBe(true);
  });

  it('rejects non-positive limits and empty category lists', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('budget-invalid-1'),
      'Secure-password-2'
    );
    if (context === null) return;

    const category = await createExpenseCategory('Pets');

    await expect(
      client.budget.create.mutate({
        limit: '0',
        period: 'monthly',
        categoryIds: [category.id],
      })
    ).rejects.toThrow();
    await expect(
      client.budget.create.mutate({
        limit: '-10',
        period: 'monthly',
        categoryIds: [category.id],
      })
    ).rejects.toThrow();
    await expect(
      client.budget.create.mutate({
        limit: '100',
        period: 'monthly',
        categoryIds: [],
      })
    ).rejects.toThrow();
    await expect(
      client.budget.create.mutate({
        limit: '100',
        period: 'daily' as 'monthly',
        categoryIds: [category.id],
      })
    ).rejects.toThrow();
  });

  it('rejects income categories and categories from another household', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('budget-type-1'),
      'Secure-password-3'
    );
    if (context === null) return;

    const income = await client.category.create.mutate({
      name: 'Salary',
      type: TransactionType.Income,
    });
    const expense = await createExpenseCategory('Household One Expense');
    await expect(
      client.budget.create.mutate({
        limit: '100',
        period: 'monthly',
        categoryIds: [income.id],
      })
    ).rejects.toThrow();

    await registerAndCreateHousehold(makeTestEmail('budget-type-2'), 'Secure-password-4');
    await expect(
      client.budget.create.mutate({
        limit: '100',
        period: 'monthly',
        categoryIds: [expense.id],
      })
    ).rejects.toThrow();

    // The first household's budgets are invisible here.
    const list = await client.budget.list.query();
    expect(list).toEqual([]);
  });

  it('updates a Budget limit, period, name, and categories', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('budget-update-1'),
      'Secure-password-5'
    );
    if (context === null) return;

    const first = await createExpenseCategory('First');
    const second = await createExpenseCategory('Second');

    const budget = await client.budget.create.mutate({
      limit: '100',
      period: 'weekly',
      categoryIds: [first.id],
    });

    const updated = await client.budget.update.mutate({
      id: budget.id,
      name: 'Updated',
      limit: '250.50',
      period: 'yearly',
      categoryIds: [first.id, second.id],
    });
    expect(updated.name).toBe('Updated');
    expect(updated.limit).toBe('250.50');
    expect(updated.period).toBe('yearly');
    expect(updated.categoryIds).toEqual(expect.arrayContaining([first.id, second.id]));

    const refetched = await client.budget.get.query({ id: budget.id });
    expect(refetched.limit).toBe('250.50');
  });

  it('deletes a Budget', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('budget-delete-1'),
      'Secure-password-6'
    );
    if (context === null) return;

    const category = await createExpenseCategory('One-off');
    const budget = await client.budget.create.mutate({
      limit: '100',
      period: 'monthly',
      categoryIds: [category.id],
    });

    const deleted = await client.budget.delete.mutate({ id: budget.id });
    expect(deleted.ok).toBe(true);
    await expect(client.budget.get.query({ id: budget.id })).rejects.toThrow();
  });

  it('refuses to delete a Category that is used by a Budget', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('budget-category-guard-1'),
      'Secure-password-7'
    );
    if (context === null) return;

    const category = await createExpenseCategory('Guarded');
    await client.budget.create.mutate({
      limit: '100',
      period: 'monthly',
      categoryIds: [category.id],
    });

    await expect(client.category.delete.mutate({ id: category.id })).rejects.toThrow();

    // Deleting the Budget releases the Category.
    const budgets = await client.budget.list.query();
    await client.budget.delete.mutate({ id: budgets[0].id });
    const deleted = await client.category.delete.mutate({ id: category.id });
    expect(deleted.ok).toBe(true);
  });

  it('rejects access to budgets outside the household', async () => {
    const firstContext = await registerAndCreateHousehold(
      makeTestEmail('budget-isolation-1'),
      'Secure-password-8'
    );
    if (firstContext === null) return;

    const category = await createExpenseCategory('Isolated');
    const budget = await client.budget.create.mutate({
      limit: '100',
      period: 'monthly',
      categoryIds: [category.id],
    });

    await registerAndCreateHousehold(makeTestEmail('budget-isolation-2'), 'Secure-password-9');

    await expect(client.budget.get.query({ id: budget.id })).rejects.toThrow();
    await expect(client.budget.update.mutate({ id: budget.id, limit: '1' })).rejects.toThrow();
    await expect(client.budget.delete.mutate({ id: budget.id })).rejects.toThrow();

    const list = await client.budget.list.query();
    expect(list.find((b) => b.id === budget.id)).toBeUndefined();
  });
});
