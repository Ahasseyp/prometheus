import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AccountType } from '@prometheus/domain';
import { getPrisma } from '../prisma.js';
import {
  createAccount,
  deleteAccount,
  findAccountById,
  listAccountsForHousehold,
  mapDomainAccountType,
  mapPrismaAccountType,
  updateAccount,
} from './account.js';

describe('account service', () => {
  const createdHouseholdIds: string[] = [];
  const createdAccountIds: string[] = [];

  beforeAll(async () => {
    const prisma = getPrisma();
    const household = await prisma.household.create({
      data: { name: 'Service Test Household', reportingCurrency: 'USD' },
    });
    createdHouseholdIds.push(household.id);
  });

  afterAll(async () => {
    const prisma = getPrisma();
    if (createdAccountIds.length > 0) {
      await prisma.account.deleteMany({
        where: { id: { in: createdAccountIds } },
      });
    }
    if (createdHouseholdIds.length > 0) {
      await prisma.household.deleteMany({
        where: { id: { in: createdHouseholdIds } },
      });
    }
  });

  function householdId() {
    return createdHouseholdIds[0];
  }

  it('maps account types between Prisma and domain', () => {
    expect(mapPrismaAccountType('CHECKING')).toBe(AccountType.Checking);
    expect(mapPrismaAccountType('CREDIT_CARD')).toBe(AccountType.CreditCard);
    expect(mapDomainAccountType(AccountType.Loan)).toBe('LOAN');
    expect(mapDomainAccountType(AccountType.Investment)).toBe('INVESTMENT');
  });

  it('creates an account scoped to a household', async () => {
    const account = await createAccount(
      { name: 'Service Checking', type: AccountType.Checking, currency: 'USD' },
      householdId()
    );

    createdAccountIds.push(account.id);
    expect(account.name).toBe('Service Checking');
    expect(account.type).toBe(AccountType.Checking);
    expect(account.currency).toBe('USD');
    expect(account.householdId).toBe(householdId());
    expect(account.balance).toBe('0');
  });

  it('lists accounts only for the requested household', async () => {
    const prisma = getPrisma();
    const otherHousehold = await prisma.household.create({
      data: { name: 'Other Household', reportingCurrency: 'MXN' },
    });
    createdHouseholdIds.push(otherHousehold.id);

    const ownAccount = await createAccount(
      { name: 'Own Account', type: AccountType.Savings, currency: 'USD' },
      householdId()
    );
    createdAccountIds.push(ownAccount.id);

    const otherAccount = await createAccount(
      { name: 'Other Account', type: AccountType.Cash, currency: 'MXN' },
      otherHousehold.id
    );
    createdAccountIds.push(otherAccount.id);

    const accounts = await listAccountsForHousehold(householdId());

    expect(accounts).toHaveLength(2);
    expect(accounts.map((a) => a.name)).toContain('Own Account');
    expect(accounts.map((a) => a.name)).not.toContain('Other Account');
  });

  it('finds an account by id only within the same household', async () => {
    const account = await createAccount(
      { name: 'Findable', type: AccountType.Loan, currency: 'USD' },
      householdId()
    );
    createdAccountIds.push(account.id);

    const found = await findAccountById(account.id, householdId());
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Findable');

    const notFound = await findAccountById(account.id, '00000000-0000-0000-0000-000000000000');
    expect(notFound).toBeNull();
  });

  it('updates an account', async () => {
    const account = await createAccount(
      { name: 'Before', type: AccountType.Checking, currency: 'USD' },
      householdId()
    );
    createdAccountIds.push(account.id);

    const updated = await updateAccount(account.id, householdId(), {
      name: 'After',
      type: AccountType.Investment,
      currency: 'EUR',
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('After');
    expect(updated?.type).toBe(AccountType.Investment);
    expect(updated?.currency).toBe('EUR');
  });

  it('returns null when updating an account outside the household', async () => {
    const result = await updateAccount('00000000-0000-0000-0000-000000000000', householdId(), {
      name: 'Ghost',
    });
    expect(result).toBeNull();
  });

  it('deletes an account scoped to the household', async () => {
    const account = await createAccount(
      { name: 'To Delete', type: AccountType.CreditCard, currency: 'MXN' },
      householdId()
    );

    const deleted = await deleteAccount(account.id, householdId());
    expect(deleted).toBe(true);

    const notFound = await findAccountById(account.id, householdId());
    expect(notFound).toBeNull();
  });

  it('returns false when deleting an account outside the household', async () => {
    const deleted = await deleteAccount('00000000-0000-0000-0000-000000000000', householdId());
    expect(deleted).toBe(false);
  });
});
