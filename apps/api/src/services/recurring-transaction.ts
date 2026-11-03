import crypto from 'node:crypto';

import {
  anchoredPeriodFor,
  createRecurringTransaction as createRecurringTransactionEntity,
  isCurrencyCode,
  makeAccountId,
  makeCategoryId,
  makeHouseholdId,
  makeRecurringTransactionId,
  RecurrenceFrequency,
} from '@prometheus/domain';
import type { RecurrenceFrequency as DomainRecurrenceFrequency } from '@prometheus/domain';
import type { RecurringTransaction as PrismaRecurringTransaction } from '@prisma/client';

import { getPrisma } from '../prisma.js';
import { minorUnitsToDecimal, parseAmountToMinorUnits } from '../lib/money.js';
import { mapPrismaTransactionType, mapDomainTransactionType } from '../lib/transaction-type.js';

export type CreateRecurringTransactionInput = {
  accountId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: string;
  startDate: Date;
  frequency: DomainRecurrenceFrequency;
  description?: string;
};

export type RecurringTransactionRecord = {
  id: string;
  householdId: string;
  accountId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: string;
  startDate: Date;
  frequency: DomainRecurrenceFrequency;
  nextDate: Date;
  description: string;
  accountName: string;
  accountCurrency: string;
  categoryName: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RecurringTransactionValidationError =
  'invalid-data' | 'account-not-found' | 'category-not-found' | 'type-mismatch' | 'invalid-amount';

export type CreateRecurringTransactionResult =
  | { ok: true; recurringTransaction: RecurringTransactionRecord }
  | { ok: false; error: RecurringTransactionValidationError };

// The tRPC layer validates first.
function unexpectedValidationError(reason: string): Error {
  return new Error(`Unexpected recurring transaction validation failure: ${reason}`);
}

const prismaFrequencyMap: Record<
  PrismaRecurringTransaction['frequency'],
  DomainRecurrenceFrequency
> = {
  WEEKLY: RecurrenceFrequency.Weekly,
  MONTHLY: RecurrenceFrequency.Monthly,
  YEARLY: RecurrenceFrequency.Yearly,
};

const domainFrequencyMap: Record<
  DomainRecurrenceFrequency,
  PrismaRecurringTransaction['frequency']
> = {
  [RecurrenceFrequency.Weekly]: 'WEEKLY',
  [RecurrenceFrequency.Monthly]: 'MONTHLY',
  [RecurrenceFrequency.Yearly]: 'YEARLY',
};

export function mapPrismaRecurrenceFrequency(
  frequency: PrismaRecurringTransaction['frequency']
): DomainRecurrenceFrequency {
  return prismaFrequencyMap[frequency];
}

export function mapDomainRecurrenceFrequency(
  frequency: DomainRecurrenceFrequency
): PrismaRecurringTransaction['frequency'] {
  return domainFrequencyMap[frequency];
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Reuses the budget-period anchored-period math: a Recurring Transaction's
// next occurrence is the start of the anchored period containing the reference
// date. This will move to packages/domain/src/recurrence.ts in slice 4.
function mapToBudgetPeriod(frequency: DomainRecurrenceFrequency): 'weekly' | 'monthly' | 'yearly' {
  return frequency;
}

function nextOccurrenceOnOrAfter(
  startDate: Date,
  frequency: DomainRecurrenceFrequency,
  reference: Date
): Date {
  const period = mapToBudgetPeriod(frequency);
  return anchoredPeriodFor(startDate, reference, period).start;
}

function getToday(): Date {
  return startOfUtcDay(new Date());
}

async function findAccountInHousehold(accountId: string, householdId: string) {
  return getPrisma().account.findFirst({ where: { id: accountId, householdId } });
}

async function findCategoryInHousehold(categoryId: string, householdId: string) {
  return getPrisma().category.findFirst({ where: { id: categoryId, householdId } });
}

function mapRecurringTransactionToRecord(
  recurringTransaction: PrismaRecurringTransaction & {
    account: { name: string; currency: string };
    category: { name: string };
  }
): RecurringTransactionRecord {
  const currency = recurringTransaction.account.currency;
  if (!isCurrencyCode(currency)) {
    throw unexpectedValidationError(`unsupported-currency:${currency}`);
  }

  const frequency = mapPrismaRecurrenceFrequency(recurringTransaction.frequency);
  const nextDate = nextOccurrenceOnOrAfter(recurringTransaction.startDate, frequency, getToday());

  return {
    id: recurringTransaction.id,
    householdId: recurringTransaction.householdId,
    accountId: recurringTransaction.accountId,
    categoryId: recurringTransaction.categoryId,
    type: mapPrismaTransactionType(recurringTransaction.type) as 'income' | 'expense',
    amount: minorUnitsToDecimal(recurringTransaction.amount, currency),
    startDate: recurringTransaction.startDate,
    frequency,
    nextDate,
    description: recurringTransaction.description,
    accountName: recurringTransaction.account.name,
    accountCurrency: recurringTransaction.account.currency,
    categoryName: recurringTransaction.category.name,
    createdAt: recurringTransaction.createdAt,
    updatedAt: recurringTransaction.updatedAt,
  };
}

export async function createRecurringTransaction(
  input: CreateRecurringTransactionInput,
  householdId: string
): Promise<CreateRecurringTransactionResult> {
  const account = await findAccountInHousehold(input.accountId, householdId);
  if (account === null) {
    return { ok: false, error: 'account-not-found' };
  }

  const category = await findCategoryInHousehold(input.categoryId, householdId);
  if (category === null) {
    return { ok: false, error: 'category-not-found' };
  }

  if (category.type !== mapDomainTransactionType(input.type)) {
    return { ok: false, error: 'type-mismatch' };
  }

  const currency = account.currency;
  if (!isCurrencyCode(currency)) {
    throw unexpectedValidationError(`unsupported-currency:${currency}`);
  }

  const amountResult = parseAmountToMinorUnits(input.amount, currency);
  if (!amountResult.ok) {
    return { ok: false, error: 'invalid-amount' };
  }

  const entityResult = createRecurringTransactionEntity({
    id: makeRecurringTransactionId(crypto.randomUUID()),
    householdId: makeHouseholdId(householdId),
    accountId: makeAccountId(account.id),
    categoryId: makeCategoryId(category.id),
    type: input.type,
    amountMinorUnits: amountResult.minorUnits,
    startDate: input.startDate,
    frequency: input.frequency,
    description: input.description,
  });

  if (!entityResult.ok) {
    return { ok: false, error: 'invalid-data' };
  }

  const validated = entityResult.value;
  const prisma = getPrisma();
  const recurringTransaction = await prisma.recurringTransaction.create({
    data: {
      id: validated.id,
      householdId: validated.householdId,
      accountId: validated.accountId,
      categoryId: validated.categoryId,
      type: mapDomainTransactionType(validated.type),
      amount: validated.amountMinorUnits,
      startDate: validated.startDate,
      frequency: mapDomainRecurrenceFrequency(validated.frequency),
      description: validated.description,
    },
    include: { account: true, category: true },
  });

  return { ok: true, recurringTransaction: mapRecurringTransactionToRecord(recurringTransaction) };
}

export async function listRecurringTransactionsForHousehold(
  householdId: string
): Promise<RecurringTransactionRecord[]> {
  const prisma = getPrisma();
  const recurringTransactions = await prisma.recurringTransaction.findMany({
    where: { householdId },
    orderBy: { createdAt: 'asc' },
    include: { account: true, category: true },
  });

  return recurringTransactions.map(mapRecurringTransactionToRecord);
}
