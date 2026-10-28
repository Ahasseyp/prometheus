import crypto from 'node:crypto';

import {
  createAccount as createAccountEntity,
  createMoneyFromMinorUnits,
  isCurrencyCode,
  AccountType,
  makeAccountId,
  makeHouseholdId,
} from '@prometheus/domain';
import type { AccountType as DomainAccountType, Money } from '@prometheus/domain';
import { Prisma } from '@prisma/client';
import type { Account } from '@prisma/client';

import { getPrisma } from '../prisma.js';

export type CreateAccountInput = {
  name: string;
  type: DomainAccountType;
  currency: string;
};

export type UpdateAccountInput = {
  name?: string;
  type?: DomainAccountType;
};

export type AccountWithBalance = {
  id: string;
  householdId: string;
  name: string;
  type: DomainAccountType;
  currency: string;
  balance: string;
  createdAt: Date;
  updatedAt: Date;
};

// The tRPC layer validates input before these services run, so reaching one of
// these means a caller bypassed the schema — hence "unexpected".
function unexpectedValidationError(reason: string): Error {
  return new Error(`Unexpected account validation failure: ${reason}`);
}

const prismaAccountTypeMap: Record<Account['type'], DomainAccountType> = {
  CHECKING: AccountType.Checking,
  SAVINGS: AccountType.Savings,
  CREDIT_CARD: AccountType.CreditCard,
  CASH: AccountType.Cash,
  INVESTMENT: AccountType.Investment,
  LOAN: AccountType.Loan,
};

const domainAccountTypeMap: Record<DomainAccountType, Account['type']> = {
  [AccountType.Checking]: 'CHECKING',
  [AccountType.Savings]: 'SAVINGS',
  [AccountType.CreditCard]: 'CREDIT_CARD',
  [AccountType.Cash]: 'CASH',
  [AccountType.Investment]: 'INVESTMENT',
  [AccountType.Loan]: 'LOAN',
};

export function mapPrismaAccountType(type: Account['type']): DomainAccountType {
  return prismaAccountTypeMap[type];
}

export function mapDomainAccountType(type: DomainAccountType): Account['type'] {
  return domainAccountTypeMap[type];
}

function createMoneyInAccountCurrency(
  minorUnits: bigint,
  account: Pick<Account, 'currency'>
): Money {
  if (!isCurrencyCode(account.currency)) {
    throw unexpectedValidationError(`unsupported-currency:${account.currency}`);
  }
  const moneyResult = createMoneyFromMinorUnits(minorUnits, account.currency);
  if (!moneyResult.ok) {
    throw unexpectedValidationError(moneyResult.error.type);
  }
  return moneyResult.value;
}

// Balance is derived from the transaction ledger: income adds, expense
// subtracts (issue #24). Sums are Money values in the Account Currency and
// are only formatted to decimal strings at the response boundary.
async function sumAccountBalances(
  accounts: Array<Pick<Account, 'id' | 'currency'>>
): Promise<Map<string, Money>> {
  const balances = new Map<string, Money>();
  for (const account of accounts) {
    balances.set(account.id, createMoneyInAccountCurrency(0n, account));
  }
  if (accounts.length === 0) {
    return balances;
  }

  const prisma = getPrisma();
  const grouped = await prisma.transaction.groupBy({
    by: ['accountId', 'type'],
    where: { accountId: { in: accounts.map((account) => account.id) } },
    _sum: { amount: true },
  });

  for (const row of grouped) {
    const current = balances.get(row.accountId);
    if (current === undefined) {
      throw unexpectedValidationError('balance-for-unknown-account');
    }
    const total = createMoneyInAccountCurrency(row._sum.amount ?? 0n, {
      currency: current.currency,
    });
    // Same currency within one account, so add/subtract cannot mismatch;
    // a mismatch Result here means a data bug and must not pass silently.
    const next = row.type === 'INCOME' ? current.add(total) : current.subtract(total);
    if (!next.ok) {
      throw unexpectedValidationError(next.error.type);
    }
    balances.set(row.accountId, next.value);
  }

  return balances;
}

function mapAccountToWithBalance(
  account: Account,
  balances: Map<string, Money>
): AccountWithBalance {
  const balance = balances.get(account.id);
  if (balance === undefined) {
    throw unexpectedValidationError('missing-balance');
  }
  return {
    id: account.id,
    householdId: account.householdId,
    name: account.name,
    type: mapPrismaAccountType(account.type),
    currency: account.currency,
    balance: balance.toDecimal(),
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function createAccount(
  input: CreateAccountInput,
  householdId: string
): Promise<AccountWithBalance> {
  const entityResult = createAccountEntity({
    id: makeAccountId(crypto.randomUUID()),
    householdId: makeHouseholdId(householdId),
    name: input.name,
    type: input.type,
    currency: input.currency,
  });

  if (!entityResult.ok) {
    throw unexpectedValidationError(entityResult.error.type);
  }

  const validatedAccount = entityResult.value;
  const prisma = getPrisma();
  const account = await prisma.account.create({
    data: {
      id: validatedAccount.id,
      householdId: validatedAccount.householdId,
      name: validatedAccount.name,
      type: mapDomainAccountType(validatedAccount.type),
      currency: validatedAccount.currency,
    },
  });

  return mapAccountToWithBalance(account, await sumAccountBalances([account]));
}

export async function listAccountsForHousehold(householdId: string): Promise<AccountWithBalance[]> {
  const prisma = getPrisma();
  const accounts = await prisma.account.findMany({
    where: { householdId },
    orderBy: { createdAt: 'asc' },
  });

  const balances = await sumAccountBalances(accounts);
  return accounts.map((account) => mapAccountToWithBalance(account, balances));
}

export async function findAccountInHousehold(accountId: string, householdId: string) {
  const prisma = getPrisma();
  return prisma.account.findFirst({ where: { id: accountId, householdId } });
}

export async function findAccountById(
  accountId: string,
  householdId: string
): Promise<AccountWithBalance | null> {
  const prisma = getPrisma();
  const account = await prisma.account.findFirst({
    where: { id: accountId, householdId },
  });

  if (account === null) {
    return null;
  }

  return mapAccountToWithBalance(account, await sumAccountBalances([account]));
}

export async function updateAccount(
  accountId: string,
  householdId: string,
  input: UpdateAccountInput
): Promise<AccountWithBalance | null> {
  const updateData: Partial<Pick<Account, 'name' | 'type'>> = {};

  if (input.name !== undefined) {
    const trimmedName = input.name.trim();
    if (trimmedName === '') {
      throw unexpectedValidationError('empty-name');
    }
    updateData.name = trimmedName;
  }

  if (input.type !== undefined) {
    updateData.type = mapDomainAccountType(input.type);
  }

  const prisma = getPrisma();
  try {
    // Household scoping lives in the write itself, not a pre-check, so the
    // scope check and the mutation are atomic.
    const account = await prisma.account.update({
      where: { id: accountId, householdId },
      data: updateData,
    });
    return mapAccountToWithBalance(account, await sumAccountBalances([account]));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

export async function deleteAccount(accountId: string, householdId: string): Promise<boolean> {
  const prisma = getPrisma();
  try {
    await prisma.account.delete({
      where: { id: accountId, householdId },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return false;
    }
    throw error;
  }
}
