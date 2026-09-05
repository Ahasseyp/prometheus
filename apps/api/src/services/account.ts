import crypto from 'node:crypto';

import {
  createAccount as createAccountEntity,
  AccountType,
  makeAccountId,
  makeHouseholdId,
} from '@prometheus/domain';
import type { AccountType as DomainAccountType } from '@prometheus/domain';
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

function computeAccountBalance(): string {
  // v1 does not yet have a transaction ledger (#24). Once transactions are
  // introduced, this should sum the ledger for the account. For now every
  // account starts with a zero balance, which matches the spec fallback for
  // accounts with no transactions.
  return '0';
}

function mapAccountToWithBalance(account: Account): AccountWithBalance {
  return {
    id: account.id,
    householdId: account.householdId,
    name: account.name,
    type: mapPrismaAccountType(account.type),
    currency: account.currency,
    balance: computeAccountBalance(),
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

  return mapAccountToWithBalance(account);
}

export async function listAccountsForHousehold(householdId: string): Promise<AccountWithBalance[]> {
  const prisma = getPrisma();
  const accounts = await prisma.account.findMany({
    where: { householdId },
    orderBy: { createdAt: 'asc' },
  });

  return accounts.map(mapAccountToWithBalance);
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

  return mapAccountToWithBalance(account);
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
    return mapAccountToWithBalance(account);
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
