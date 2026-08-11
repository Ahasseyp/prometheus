import crypto from 'node:crypto';

import {
  createAccount as createAccountEntity,
  AccountType,
  isCurrencyCode,
  makeAccountId,
  makeHouseholdId,
} from '@prometheus/domain';
import type { AccountType as DomainAccountType } from '@prometheus/domain';
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
  currency?: string;
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
  // v1 does not yet have a transaction ledger. Once transactions are
  // introduced, this should sum the ledger for the account. For now every
  // account starts with a zero balance.
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
    // The API layer already validates name, type, and currency, so reaching
    // this branch means a caller bypassed the tRPC input schema.
    throw new Error(`Unexpected account validation failure: ${entityResult.error.type}`);
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
  const existing = await findAccountById(accountId, householdId);
  if (existing === null) {
    return null;
  }

  const updateData: Partial<Pick<Account, 'name' | 'type' | 'currency'>> = {};

  if (input.name !== undefined) {
    const trimmedName = input.name.trim();
    if (trimmedName === '') {
      throw new Error('Unexpected account validation failure: empty-name');
    }
    updateData.name = trimmedName;
  }

  if (input.type !== undefined) {
    updateData.type = mapDomainAccountType(input.type);
  }

  if (input.currency !== undefined) {
    if (!isCurrencyCode(input.currency)) {
      // The API layer already validates currency, so reaching this branch
      // means a caller bypassed the tRPC input schema.
      throw new Error(`Unexpected account validation failure: invalid-currency`);
    }
    updateData.currency = input.currency;
  }

  const prisma = getPrisma();
  const account = await prisma.account.update({
    where: { id: accountId },
    data: updateData,
  });

  return mapAccountToWithBalance(account);
}

export async function deleteAccount(accountId: string, householdId: string): Promise<boolean> {
  const existing = await findAccountById(accountId, householdId);
  if (existing === null) {
    return false;
  }

  const prisma = getPrisma();
  await prisma.account.delete({
    where: { id: accountId },
  });

  return true;
}
