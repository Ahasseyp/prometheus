import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';
import { AccountType, TransactionType } from '@prometheus/domain';

describe.sequential('goal contribution procedures', () => {
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

  async function setupFundedAccount(fundAmount: string, currency = 'USD') {
    const incomeCategory = await client.category.create.mutate({
      name: 'Income',
      type: TransactionType.Income,
    });
    const account = await client.account.create.mutate({
      name: `${currency} Account`,
      type: AccountType.Savings,
      currency,
    });
    await client.transaction.create.mutate({
      type: TransactionType.Income,
      amount: fundAmount,
      accountId: account.id,
      categoryId: incomeCategory.id,
      date: new Date('2026-01-01T00:00:00.000Z'),
    });
    return account;
  }

  it('creates a Contribution from a matching Account and updates the Goal saved amount', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('contribution-create-1'),
      'Secure-password-1'
    );
    if (context === null) return;

    const account = await setupFundedAccount('1000.00');
    const goal = await client.goal.create.mutate({
      name: 'Emergency Fund',
      target: '500.00',
      currency: 'USD',
      deadline: new Date('2027-06-30T00:00:00.000Z'),
    });

    const contribution = await client.goalContribution.create.mutate({
      goalId: goal.id,
      accountId: account.id,
      amount: '200.00',
    });

    expect(contribution.goalId).toBe(goal.id);
    expect(contribution.accountId).toBe(account.id);
    expect(contribution.amount).toBe('200.00');

    const fetched = await client.goal.get.query({ id: goal.id });
    expect(fetched.savedAmount).toBe('200.00');

    const list = await client.goalContribution.list.query({ goalId: goal.id });
    expect(list.some((c) => c.id === contribution.id)).toBe(true);
  });

  it('rejects Contributions above the Account Unallocated Balance, including edits', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('contribution-over-1'),
      'Secure-password-2'
    );
    if (context === null) return;

    const account = await setupFundedAccount('100.00');
    const goal = await client.goal.create.mutate({
      name: 'Big Goal',
      target: '1000.00',
      currency: 'USD',
      deadline: new Date('2027-06-30T00:00:00.000Z'),
    });

    // The balance is 100, so anything above it cannot be earmarked.
    await expect(
      client.goalContribution.create.mutate({
        goalId: goal.id,
        accountId: account.id,
        amount: '100.01',
      })
    ).rejects.toThrow();

    const contribution = await client.goalContribution.create.mutate({
      goalId: goal.id,
      accountId: account.id,
      amount: '60.00',
    });

    // Replacing 60 with 100 fits exactly; a cent more does not.
    await client.goalContribution.update.mutate({ id: contribution.id, amount: '100.00' });
    await expect(
      client.goalContribution.update.mutate({ id: contribution.id, amount: '100.01' })
    ).rejects.toThrow();

    const fetched = await client.goal.get.query({ id: goal.id });
    expect(fetched.savedAmount).toBe('100.00');
  });

  it('rejects Currency mismatches and unknown Accounts', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('contribution-currency-1'),
      'Secure-password-3'
    );
    if (context === null) return;

    const usdAccount = await setupFundedAccount('100.00', 'USD');
    const eurAccount = await setupFundedAccount('100.00', 'EUR');
    const usdGoal = await client.goal.create.mutate({
      name: 'USD Goal',
      target: '1000.00',
      currency: 'USD',
      deadline: new Date('2027-06-30T00:00:00.000Z'),
    });
    const eurGoal = await client.goal.create.mutate({
      name: 'EUR Goal',
      target: '1000.00',
      currency: 'EUR',
      deadline: new Date('2027-06-30T00:00:00.000Z'),
    });

    await expect(
      client.goalContribution.create.mutate({
        goalId: usdGoal.id,
        accountId: eurAccount.id,
        amount: '10.00',
      })
    ).rejects.toThrow();

    await expect(
      client.goalContribution.create.mutate({
        goalId: usdGoal.id,
        accountId: usdAccount.id,
        amount: '0',
      })
    ).rejects.toThrow();

    await expect(
      client.goalContribution.create.mutate({
        goalId: eurGoal.id,
        accountId: usdAccount.id,
        amount: '10.00',
      })
    ).rejects.toThrow();

    await expect(
      client.goalContribution.create.mutate({
        goalId: usdGoal.id,
        accountId: '00000000-0000-0000-0000-000000000000',
        amount: '10.00',
      })
    ).rejects.toThrow();
  });

  it('edits and deletes Contributions, updating the Goal saved amount', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('contribution-edit-1'),
      'Secure-password-4'
    );
    if (context === null) return;

    const firstAccount = await setupFundedAccount('100.00');
    const secondAccount = await setupFundedAccount('500.00');
    const goal = await client.goal.create.mutate({
      name: 'Editable Goal',
      target: '1000.00',
      currency: 'USD',
      deadline: new Date('2027-06-30T00:00:00.000Z'),
    });

    const contribution = await client.goalContribution.create.mutate({
      goalId: goal.id,
      accountId: firstAccount.id,
      amount: '100.00',
    });

    const updated = await client.goalContribution.update.mutate({
      id: contribution.id,
      amount: '150.00',
      accountId: secondAccount.id,
    });
    expect(updated.amount).toBe('150.00');
    expect(updated.accountId).toBe(secondAccount.id);

    let fetched = await client.goal.get.query({ id: goal.id });
    expect(fetched.savedAmount).toBe('150.00');

    // Moving back to the first Account exceeds its 100 balance.
    await expect(
      client.goalContribution.update.mutate({ id: contribution.id, accountId: firstAccount.id })
    ).rejects.toThrow();

    const movedBack = await client.goalContribution.update.mutate({
      id: contribution.id,
      amount: '100.00',
      accountId: firstAccount.id,
    });
    expect(movedBack.accountId).toBe(firstAccount.id);

    const deleted = await client.goalContribution.delete.mutate({ id: contribution.id });
    expect(deleted.ok).toBe(true);

    fetched = await client.goal.get.query({ id: goal.id });
    expect(fetched.savedAmount).toBe('0.00');

    await expect(client.goalContribution.get.query({ id: contribution.id })).rejects.toThrow();
  });

  it('cascades Contributions when the Goal or Account is deleted', async () => {
    const context = await registerAndCreateHousehold(
      makeTestEmail('contribution-cascade-1'),
      'Secure-password-5'
    );
    if (context === null) return;

    const account = await setupFundedAccount('500.00');
    const goal = await client.goal.create.mutate({
      name: 'Cascading Goal',
      target: '1000.00',
      currency: 'USD',
      deadline: new Date('2027-06-30T00:00:00.000Z'),
    });
    await client.goalContribution.create.mutate({
      goalId: goal.id,
      accountId: account.id,
      amount: '100.00',
    });

    await client.goal.delete.mutate({ id: goal.id });
    await expect(client.goalContribution.list.query({ goalId: goal.id })).rejects.toThrow();

    const secondGoal = await client.goal.create.mutate({
      name: 'Second Goal',
      target: '1000.00',
      currency: 'USD',
      deadline: new Date('2027-06-30T00:00:00.000Z'),
    });
    const contribution = await client.goalContribution.create.mutate({
      goalId: secondGoal.id,
      accountId: account.id,
      amount: '100.00',
    });

    await client.account.delete.mutate({ id: account.id });
    await expect(client.goalContribution.get.query({ id: contribution.id })).rejects.toThrow();

    const fetched = await client.goal.get.query({ id: secondGoal.id });
    expect(fetched.savedAmount).toBe('0.00');
  });

  it('rejects access to Contributions outside the household', async () => {
    const firstContext = await registerAndCreateHousehold(
      makeTestEmail('contribution-isolation-1'),
      'Secure-password-6'
    );
    if (firstContext === null) return;

    const account = await setupFundedAccount('500.00');
    const goal = await client.goal.create.mutate({
      name: 'Isolated Goal',
      target: '1000.00',
      currency: 'USD',
      deadline: new Date('2027-06-30T00:00:00.000Z'),
    });
    const contribution = await client.goalContribution.create.mutate({
      goalId: goal.id,
      accountId: account.id,
      amount: '100.00',
    });

    await registerAndCreateHousehold(
      makeTestEmail('contribution-isolation-2'),
      'Secure-password-7'
    );

    await expect(client.goalContribution.get.query({ id: contribution.id })).rejects.toThrow();
    await expect(
      client.goalContribution.update.mutate({ id: contribution.id, amount: '1.00' })
    ).rejects.toThrow();
    await expect(client.goalContribution.delete.mutate({ id: contribution.id })).rejects.toThrow();
    await expect(client.goalContribution.list.query({ goalId: goal.id })).rejects.toThrow();
  });
});
