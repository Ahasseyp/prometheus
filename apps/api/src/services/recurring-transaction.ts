import crypto from 'node:crypto';

import {
  createRecurringTransaction as createRecurringTransactionEntity,
  createTransaction as createTransactionEntity,
  dueRecurringTransactionInstances,
  isCurrencyCode,
  isRecurrencePeriod,
  makeAccountId,
  makeCategoryId,
  makeHouseholdId,
  makeRecurringTransactionId,
  makeTransactionId,
  nextRecurringTransactionInstanceDateAfter,
  RecurrencePeriod,
} from '@prometheus/domain';
import type { RecurrencePeriod as DomainRecurrencePeriod } from '@prometheus/domain';
import type { Prisma, RecurringTransaction as PrismaRecurringTransaction } from '@prisma/client';

import { getPrisma } from '../prisma.js';
import { minorUnitsToDecimal, parseAmountToMinorUnits } from '../lib/money.js';
import { mapPrismaTransactionType, mapDomainTransactionType } from '../lib/transaction-type.js';
import { amountFitsCurrency, resolveTransactionExchangeRate } from './transaction.js';

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

export type UpdateRecurringTransactionInput = {
  type?: 'income' | 'expense';
  amount?: string;
  accountId?: string;
  categoryId?: string;
  interval?: number;
  period?: DomainRecurrencePeriod;
  startDate?: Date;
  description?: string;
};

export type UpdateRecurringTransactionResult =
  | { ok: true; recurringTransaction: RecurringTransactionRecord }
  | { ok: false; error: RecurringTransactionValidationError | 'not-found' };

export type DeleteRecurringTransactionResult = { ok: true } | { ok: false; error: 'not-found' };

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
  const nextDate = nextRecurringTransactionInstanceDateAfter(
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

export async function updateRecurringTransaction(
  recurringTransactionId: string,
  householdId: string,
  input: UpdateRecurringTransactionInput
): Promise<UpdateRecurringTransactionResult> {
  const prisma = getPrisma();
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id: recurringTransactionId, householdId },
    include: { account: true, category: true },
  });
  if (existing === null) {
    return { ok: false, error: 'not-found' };
  }

  let targetAccount = existing.account;
  if (input.accountId !== undefined && input.accountId !== existing.accountId) {
    const account = await findAccountInHousehold(input.accountId, householdId);
    if (account === null) {
      return { ok: false, error: 'account-not-found' };
    }
    targetAccount = account;
  }

  let targetCategoryId = existing.categoryId;
  let targetCategoryType: PrismaRecurringTransaction['type'] = existing.type;
  if (input.categoryId !== undefined && input.categoryId !== existing.categoryId) {
    const category = await findCategoryInHousehold(input.categoryId, householdId);
    if (category === null) {
      return { ok: false, error: 'category-not-found' };
    }
    targetCategoryId = category.id;
    targetCategoryType = category.type;
  }

  const targetType =
    input.type === undefined ? existing.type : mapDomainTransactionType(input.type);
  if (targetCategoryType !== targetType) {
    return { ok: false, error: 'type-mismatch' };
  }

  const targetCurrency = targetAccount.currency;
  if (!isCurrencyCode(targetCurrency)) {
    throw unexpectedValidationError(`unsupported-currency:${targetCurrency}`);
  }

  const updateData: Prisma.RecurringTransactionUncheckedUpdateInput = {};

  if (input.type !== undefined) {
    updateData.type = targetType;
  }
  if (input.accountId !== undefined) {
    updateData.accountId = targetAccount.id;
  }
  if (input.categoryId !== undefined) {
    updateData.categoryId = targetCategoryId;
  }
  if (input.period !== undefined) {
    if (!isRecurrencePeriod(input.period)) {
      return { ok: false, error: 'invalid-period' };
    }
    updateData.period = mapDomainRecurrencePeriod(input.period);
  }
  if (input.interval !== undefined) {
    if (!Number.isInteger(input.interval) || input.interval < 1) {
      return { ok: false, error: 'invalid-interval' };
    }
    updateData.interval = input.interval;
  }
  if (input.startDate !== undefined) {
    updateData.startDate = input.startDate;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  if (input.amount !== undefined) {
    const amountResult = parseAmountToMinorUnits(input.amount, targetCurrency);
    if (!amountResult.ok) {
      return { ok: false, error: 'invalid-amount' };
    }
    updateData.amount = amountResult.minorUnits;
  } else if (input.accountId !== undefined && input.accountId !== existing.accountId) {
    // When changing accounts without a new amount, verify the existing amount
    // fits the target account's currency exponent.
    const compatible = amountFitsCurrency(
      existing.amount,
      existing.account.currency,
      targetAccount.currency
    );
    if (!compatible) {
      return { ok: false, error: 'invalid-amount' };
    }
  }

  const updated = await prisma.recurringTransaction.update({
    where: { id: recurringTransactionId },
    data: updateData,
    include: { account: true, category: true },
  });

  return { ok: true, recurringTransaction: mapRecurringTransactionToRecord(updated) };
}

export async function deleteRecurringTransaction(
  recurringTransactionId: string,
  householdId: string,
  removeGenerated: boolean
): Promise<DeleteRecurringTransactionResult> {
  const prisma = getPrisma();
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id: recurringTransactionId, householdId },
  });
  if (existing === null) {
    return { ok: false, error: 'not-found' };
  }

  await prisma.$transaction(async (tx) => {
    if (removeGenerated) {
      await tx.transaction.deleteMany({
        where: { recurringTransactionId, date: { gt: getToday() } },
      });
    }
    await tx.recurringTransaction.delete({ where: { id: recurringTransactionId } });
  });

  return { ok: true };
}

export async function listRecurringTransactionsForHousehold(
  householdId: string
): Promise<RecurringTransactionRecord[]> {
  await generateDueInstances(householdId);

  const prisma = getPrisma();
  const recurringTransactions = await prisma.recurringTransaction.findMany({
    where: { householdId },
    orderBy: { createdAt: 'asc' },
    include: { account: true, category: true },
  });

  return recurringTransactions.map(mapRecurringTransactionToRecord);
}

export type SkipRecurringTransactionInstanceResult =
  | { ok: true; skippedDate: Date }
  | { ok: false; error: 'not-found' | 'already-generated' | 'past-instance' };

export async function skipNextRecurringTransactionInstance(
  recurringTransactionId: string,
  householdId: string
): Promise<SkipRecurringTransactionInstanceResult> {
  const prisma = getPrisma();
  const schedule = await prisma.recurringTransaction.findFirst({
    where: { id: recurringTransactionId, householdId },
    include: { account: true, category: true },
  });

  if (schedule === null) {
    return { ok: false, error: 'not-found' };
  }

  const today = getToday();
  const nextDate = nextRecurringTransactionInstanceDateAfter(
    schedule.startDate,
    mapPrismaRecurrencePeriod(schedule.period),
    schedule.interval,
    today
  );

  // Only the upcoming Transaction Instance may be skipped; by definition it is on or
  // after today. Anything strictly before today has already been generated
  // (generation runs before skip), so disallow skipping it.
  if (nextDate < today) {
    return { ok: false, error: 'past-instance' };
  }

  const existingTransaction = await prisma.transaction.findFirst({
    where: { recurringTransactionId: schedule.id, date: nextDate },
  });
  if (existingTransaction !== null) {
    return { ok: false, error: 'already-generated' };
  }

  await prisma.skippedInstance.upsert({
    where: {
      recurringTransactionId_date: {
        recurringTransactionId: schedule.id,
        date: nextDate,
      },
    },
    create: {
      recurringTransactionId: schedule.id,
      date: nextDate,
    },
    update: {},
  });

  return { ok: true, skippedDate: nextDate };
}

async function buildTransactionInstanceData(
  schedule: PrismaRecurringTransaction & {
    account: { currency: string };
    category: { name: string };
    household: { reportingCurrency: string };
  },
  date: Date
) {
  const currency = schedule.account.currency;
  if (!isCurrencyCode(currency)) {
    throw unexpectedValidationError(`unsupported-currency:${currency}`);
  }

  const type = mapPrismaTransactionType(schedule.type) as 'income' | 'expense';
  const entityResult = createTransactionEntity({
    id: makeTransactionId(crypto.randomUUID()),
    householdId: makeHouseholdId(schedule.householdId),
    accountId: makeAccountId(schedule.accountId),
    categoryId: makeCategoryId(schedule.categoryId),
    type,
    amountMinorUnits: schedule.amount,
    date,
    description: schedule.description,
  });

  if (!entityResult.ok) {
    throw unexpectedValidationError(`invalid-transaction-entity:${entityResult.error.type}`);
  }

  const validated = entityResult.value;
  let reportingCurrency: string | null = null;
  let exchangeRate: string | null = null;

  if (currency === schedule.household.reportingCurrency) {
    reportingCurrency = currency;
    exchangeRate = '1';
  } else {
    const rate = await resolveTransactionExchangeRate(currency, schedule.householdId, date);
    if (rate !== null) {
      reportingCurrency = rate.reportingCurrency;
      exchangeRate = rate.exchangeRate;
    }
  }

  return {
    id: validated.id,
    householdId: validated.householdId,
    accountId: validated.accountId,
    categoryId: validated.categoryId,
    type: mapDomainTransactionType(validated.type),
    amount: validated.amountMinorUnits,
    date: validated.date,
    description: validated.description,
    recurringTransactionId: schedule.id,
    reportingCurrency,
    exchangeRate,
  };
}

export async function generateDueInstances(householdId?: string): Promise<void> {
  const prisma = getPrisma();
  const recurringTransactions = await prisma.recurringTransaction.findMany({
    where: householdId === undefined ? {} : { householdId },
    include: { account: true, category: true, household: true },
  });

  const today = getToday();

  for (const schedule of recurringTransactions) {
    const generatedRows = await prisma.transaction.findMany({
      where: { recurringTransactionId: schedule.id },
      select: { date: true },
    });
    const skippedRows = await prisma.skippedInstance.findMany({
      where: { recurringTransactionId: schedule.id },
      select: { date: true },
    });

    const dueDates = dueRecurringTransactionInstances({
      startDate: schedule.startDate,
      period: mapPrismaRecurrencePeriod(schedule.period),
      interval: schedule.interval,
      referenceDate: today,
      generatedDates: generatedRows.map((row) => row.date),
      skippedDates: skippedRows.map((row) => row.date),
    });

    if (dueDates.length === 0) {
      continue;
    }

    const creates: ReturnType<typeof prisma.transaction.create>[] = [];
    for (const date of dueDates) {
      const data = await buildTransactionInstanceData(schedule, date);
      creates.push(prisma.transaction.create({ data }));
    }

    await prisma.$transaction(creates);
  }
}
