import crypto from 'node:crypto';

import {
  anchoredPeriodFor,
  createRecurringTransaction as createRecurringTransactionEntity,
  isCurrencyCode,
  isRecurrencePeriod,
  makeAccountId,
  makeCategoryId,
  makeHouseholdId,
  makeRecurringTransactionId,
  RecurrencePeriod,
} from '@prometheus/domain';
import type { RecurrencePeriod as DomainRecurrencePeriod } from '@prometheus/domain';
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
  period: DomainRecurrencePeriod;
  interval: number;
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
  period: DomainRecurrencePeriod;
  interval: number;
  nextDate: Date;
  description: string;
  accountName: string;
  accountCurrency: string;
  categoryName: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RecurringTransactionValidationError =
  | 'invalid-data'
  | 'account-not-found'
  | 'category-not-found'
  | 'type-mismatch'
  | 'invalid-amount'
  | 'invalid-period'
  | 'invalid-interval';

export type CreateRecurringTransactionResult =
  | { ok: true; recurringTransaction: RecurringTransactionRecord }
  | { ok: false; error: RecurringTransactionValidationError };

// The tRPC layer validates first.
function unexpectedValidationError(reason: string): Error {
  return new Error(`Unexpected recurring transaction validation failure: ${reason}`);
}

const prismaPeriodMap: Record<PrismaRecurringTransaction['period'], DomainRecurrencePeriod> = {
  WEEK: RecurrencePeriod.Week,
  MONTH: RecurrencePeriod.Month,
  YEAR: RecurrencePeriod.Year,
};

const domainPeriodMap: Record<DomainRecurrencePeriod, PrismaRecurringTransaction['period']> = {
  [RecurrencePeriod.Week]: 'WEEK',
  [RecurrencePeriod.Month]: 'MONTH',
  [RecurrencePeriod.Year]: 'YEAR',
};

export function mapPrismaRecurrencePeriod(
  period: PrismaRecurringTransaction['period']
): DomainRecurrencePeriod {
  return prismaPeriodMap[period];
}

export function mapDomainRecurrencePeriod(
  period: DomainRecurrencePeriod
): PrismaRecurringTransaction['period'] {
  return domainPeriodMap[period];
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcMonths(date: Date, months: number): Date {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const day = Math.min(
    date.getUTCDate(),
    daysInUtcMonth(next.getUTCFullYear(), next.getUTCMonth())
  );
  next.setUTCDate(day);
  return next;
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addUtcYears(date: Date, years: number): Date {
  const next = new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), 1));
  const day = Math.min(
    date.getUTCDate(),
    daysInUtcMonth(next.getUTCFullYear(), next.getUTCMonth())
  );
  next.setUTCDate(day);
  return next;
}

function addUtcWeeks(date: Date, weeks: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + weeks * 7);
  return next;
}

function periodStartForDate(startDate: Date, period: DomainRecurrencePeriod, date: Date): Date {
  // For interval > 1 we still anchor each step to the startDate so the same
  // weekday / day-of-month is preserved.
  if (period === RecurrencePeriod.Week) {
    return anchoredPeriodFor(startDate, date, 'weekly').start;
  }
  if (period === RecurrencePeriod.Month) {
    return anchoredPeriodFor(startDate, date, 'monthly').start;
  }
  return anchoredPeriodFor(startDate, date, 'yearly').start;
}

function nextOccurrenceOnOrAfter(
  startDate: Date,
  period: DomainRecurrencePeriod,
  interval: number,
  reference: Date
): Date {
  // Fast path: if the reference is before or on the startDate, the next due
  // occurrence is the startDate itself.
  const anchor = startOfUtcDay(startDate);
  const ref = startOfUtcDay(reference);
  if (ref <= anchor) {
    return anchor;
  }

  // Walk forward in interval-sized jumps from the startDate until we land on or
  // past the reference date. This is cheap for small intervals; we keep the math
  // anchored to startDate rather than jumping from today so the day-of-month /
  // weekday is preserved.
  let next = startOfUtcDay(anchor);
  while (true) {
    const candidate = startOfUtcDay(
      period === RecurrencePeriod.Week
        ? addUtcWeeks(next, interval)
        : period === RecurrencePeriod.Month
          ? addUtcMonths(next, interval)
          : addUtcYears(next, interval)
    );
    if (candidate > ref) {
      return periodStartForDate(startDate, period, next);
    }
    if (candidate.getTime() === ref.getTime()) {
      return periodStartForDate(startDate, period, candidate);
    }
    next = candidate;
  }
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

  const period = mapPrismaRecurrencePeriod(recurringTransaction.period);
  const nextDate = nextOccurrenceOnOrAfter(
    recurringTransaction.startDate,
    period,
    recurringTransaction.interval,
    getToday()
  );

  return {
    id: recurringTransaction.id,
    householdId: recurringTransaction.householdId,
    accountId: recurringTransaction.accountId,
    categoryId: recurringTransaction.categoryId,
    type: mapPrismaTransactionType(recurringTransaction.type) as 'income' | 'expense',
    amount: minorUnitsToDecimal(recurringTransaction.amount, currency),
    startDate: recurringTransaction.startDate,
    period,
    interval: recurringTransaction.interval,
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

  if (!isRecurrencePeriod(input.period)) {
    return { ok: false, error: 'invalid-period' };
  }

  if (!Number.isInteger(input.interval) || input.interval < 1) {
    return { ok: false, error: 'invalid-interval' };
  }

  const entityResult = createRecurringTransactionEntity({
    id: makeRecurringTransactionId(crypto.randomUUID()),
    householdId: makeHouseholdId(householdId),
    accountId: makeAccountId(account.id),
    categoryId: makeCategoryId(category.id),
    type: input.type,
    amountMinorUnits: amountResult.minorUnits,
    startDate: input.startDate,
    period: input.period,
    interval: input.interval,
    description: input.description,
  });

  if (!entityResult.ok) {
    const errorType = entityResult.error.type;
    return {
      ok: false,
      error:
        errorType === 'invalid-interval'
          ? 'invalid-interval'
          : errorType === 'invalid-period'
            ? 'invalid-period'
            : 'invalid-data',
    };
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
      period: mapDomainRecurrencePeriod(validated.period),
      interval: validated.interval,
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
