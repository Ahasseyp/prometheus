import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';
import { AccountType, TransactionType } from '@prometheus/domain';

describe.sequential('category procedures', () => {
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

  it('seeds System Categories for a new household, including subcategories', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('category-seed-1'),
      'Secure-password-1'
    );
    if (context === null) return;

    const categories = await client.category.list.query();

    expect(categories.length).toBeGreaterThan(0);
    expect(categories.every((c) => c.isSystem)).toBe(true);
    expect(categories.every((c) => c.householdId === context.household.id)).toBe(true);

    const names = categories.map((c) => c.name);
    expect(names).toContain('Salary');
    expect(names).toContain('Groceries');
    expect(names).toContain('Rent');

    const salary = categories.find((c) => c.name === 'Salary');
    expect(salary?.type).toBe(TransactionType.Income);

    const utilities = categories.find((c) => c.name === 'Utilities');
    expect(utilities?.type).toBe(TransactionType.Expense);
    const electricity = categories.find((c) => c.name === 'Electricity');
    expect(electricity?.parentId).toBe(utilities?.id);
    expect(electricity?.type).toBe(TransactionType.Expense);
  });

  it('creates, renames, and deletes a Custom Category', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('category-crud-1'),
      'Secure-password-2'
    );
    if (context === null) return;

    const created = await client.category.create.mutate({
      name: 'Pets',
      type: TransactionType.Expense,
    });
    expect(created.isSystem).toBe(false);
    expect(created.parentId).toBeNull();

    const renamed = await client.category.update.mutate({ id: created.id, name: 'Pet Care' });
    expect(renamed.name).toBe('Pet Care');

    const deleted = await client.category.delete.mutate({ id: created.id });
    expect(deleted.ok).toBe(true);

    await expect(client.category.get.query({ id: created.id })).rejects.toThrow();
  });

  it('nests a subcategory one level deep and rejects deeper nesting', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('category-nesting-1'),
      'Secure-password-3'
    );
    if (context === null) return;

    const parent = await client.category.create.mutate({
      name: 'Home',
      type: TransactionType.Expense,
    });
    const child = await client.category.create.mutate({
      name: 'Garden',
      type: TransactionType.Expense,
      parentId: parent.id,
    });
    expect(child.parentId).toBe(parent.id);

    await expect(
      client.category.create.mutate({
        name: 'Too Deep',
        type: TransactionType.Expense,
        parentId: child.id,
      })
    ).rejects.toThrow();
  });

  it('rejects a subcategory whose type differs from its parent', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('category-nesting-2'),
      'Secure-password-4'
    );
    if (context === null) return;

    const parent = await client.category.create.mutate({
      name: 'Side Hustles',
      type: TransactionType.Income,
    });

    await expect(
      client.category.create.mutate({
        name: 'Wrong Type',
        type: TransactionType.Expense,
        parentId: parent.id,
      })
    ).rejects.toThrow();
  });

  it('renames a System Category but refuses to delete it', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('category-system-1'),
      'Secure-password-5'
    );
    if (context === null) return;

    const categories = await client.category.list.query();
    const groceries = categories.find((c) => c.name === 'Groceries');
    expect(groceries).toBeDefined();
    if (groceries === undefined) return;

    const renamed = await client.category.update.mutate({
      id: groceries.id,
      name: 'Food & Groceries',
    });
    expect(renamed.name).toBe('Food & Groceries');
    expect(renamed.isSystem).toBe(true);

    await expect(client.category.delete.mutate({ id: groceries.id })).rejects.toThrow();
  });

  it('refuses to delete a category that has subcategories', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('category-blocked-1'),
      'Secure-password-6'
    );
    if (context === null) return;

    const parent = await client.category.create.mutate({
      name: 'Home',
      type: TransactionType.Expense,
    });
    await client.category.create.mutate({
      name: 'Garden',
      type: TransactionType.Expense,
      parentId: parent.id,
    });

    await expect(client.category.delete.mutate({ id: parent.id })).rejects.toThrow();
  });

  it('refuses to delete a category that is used by transactions', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('category-blocked-2'),
      'Secure-password-7'
    );
    if (context === null) return;

    const category = await client.category.create.mutate({
      name: 'Coffee',
      type: TransactionType.Expense,
    });
    const account = await client.account.create.mutate({
      name: 'Checking',
      type: AccountType.Checking,
      currency: 'USD',
    });
    await client.transaction.create.mutate({
      type: TransactionType.Expense,
      amount: '4.50',
      accountId: account.id,
      categoryId: category.id,
      date: new Date('2026-08-15T00:00:00.000Z'),
    });

    await expect(client.category.delete.mutate({ id: category.id })).rejects.toThrow();
  });

  it('rejects access to categories outside the household', async () => {
    const firstContext = await registerAndCreateHousehold(
      makeTestEmail('category-isolation-1'),
      'Secure-password-8'
    );
    if (firstContext === null) return;

    const created = await client.category.create.mutate({
      name: 'Isolated Category',
      type: TransactionType.Expense,
    });

    const secondContext = await registerAndCreateHousehold(
      makeTestEmail('category-isolation-2'),
      'Secure-password-9'
    );
    if (secondContext === null) return;

    await expect(client.category.get.query({ id: created.id })).rejects.toThrow();
    await expect(
      client.category.update.mutate({ id: created.id, name: 'Hijacked' })
    ).rejects.toThrow();
    await expect(client.category.delete.mutate({ id: created.id })).rejects.toThrow();

    // The other household's categories are invisible in the list as well.
    const list = await client.category.list.query();
    expect(list.every((c) => c.householdId === secondContext.household.id)).toBe(true);
  });
});
