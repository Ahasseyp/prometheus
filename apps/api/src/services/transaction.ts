import crypto from 'node:crypto';

import {
  createMoney,
  createTransaction as createTransactionEntity,
  currencyFor,
  isCurrencyCode,
  makeAccountId,
  makeCategoryId,
  makeHouseholdId,
  makeTransactionId,
} from '@prometheus/domain';
import type { TransactionType as DomainTransactionType } from '@prometheus/domain';
import { Prisma } from '@prisma/client';
import type { Account, Category, Transaction } from '@prisma/client';

import { minorUnitsToDecimal } from '../lib/money.js';
import { getPrisma } from '../prisma.js';
import { mapDomainTransactionType, mapPrismaTransactionType } from '../lib/transaction-type.js';
import { refreshExchangeRate } from './exchange-rate.js';

export type CreateTransactionInput = {
  type: DomainTransactionType;
  amount: string;
  accountId: string;
  categoryId: string;
  date: Date;
  description?: string;
};

export type UpdateTransactionInput = {
  type?: DomainTransactionType;
  amount?: string;
  accountId?: string;
  categoryId?: string;
  date?: Date;
  description?: string;
  exchangeRate?: string;
};

export type TransactionFilters = {
  accountId?: string;
  from?: Date;
  to?: Date;
};

export type TransactionRecord = {
  id: string;
  householdId: string;
  accountId: string;
  categoryId: string;
  type: DomainTransactionType;
  amount: string;
  date: Date;
  description: string;
  reportingCurrency: string | null;
  exchangeRate: string | null;
  exchangeRateOverridden: boolean;
  createdAt: Date;
  updatedAt: Date;
  accountName: string;
  accountCurrency: string;
  categoryName: string;
};

export type TransactionErrorCode =
  | 'account-not-found'
  | 'category-not-found'
  | 'type-mismatch'
  | 'invalid-amount'
  | 'amount-incompatible-with-account'
  | 'loan-overpayment'
  | 'exchange-rate-unavailable'
  | 'invalid-data';

export type CreateTransactionResult =
  { ok: true; transaction: TransactionRecord } | { ok: false; error: TransactionErrorCode };

export type UpdateTransactionResult =
  | { ok: true; transaction: TransactionRecord }
  | { ok: false; error: TransactionErrorCode | 'not-found' };

function unexpectedValidationError(reason: string): Error {
  return new Error(`Unexpected transaction validation failure: ${reason}`);
}

type TransactionWithRelations = Transaction & { account: Account; category: Category };

function mapTransactionToRecord(transaction: TransactionWithRelations): TransactionRecord {
  const currency = transaction.account.currency;
  if (!isCurrencyCode(currency)) {
    throw unexpectedValidationError(`unsupported-currency:${currency}`);
  }
  return {
    id: transaction.id,
    householdId: transaction.householdId,
    accountId: transaction.accountId,
    categoryId: transaction.categoryId,
    type: mapPrismaTransactionType(transaction.type),
    amount: minorUnitsToDecimal(transaction.amount, currency),
    date: transaction.date,
    description: transaction.description,
    reportingCurrency: transaction.reportingCurrency,
    exchangeRate: transaction.exchangeRate?.toString() ?? null,
    exchangeRateOverridden: transaction.exchangeRateOverridden,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    accountName: transaction.account.name,
    accountCurrency: transaction.account.currency,
    categoryName: transaction.category.name,
  };
}

async function findAccountInHousehold(accountId: string, householdId: string) {
  const prisma = getPrisma();
  return prisma.account.findFirst({ where: { id: accountId, householdId } });
}

async function findCategoryInHousehold(categoryId: string, householdId: string) {
  const prisma = getPrisma();
  return prisma.category.findFirst({ where: { id: categoryId, householdId } });
}

function parseAmountToMinorUnits(
  amount: string,
  account: Account
): { ok: true; minorUnits: bigint } | { ok: false } {
  const currency = account.currency;
  if (!isCurrencyCode(currency)) {
    throw unexpectedValidationError(`unsupported-currency:${currency}`);
  }

  // Validates the decimal against the Account Currency's exponent.
  const moneyResult = createMoney(amount, currency);
  if (!moneyResult.ok) {
    return { ok: false };
  }

  // Amounts are stored unsigned; the Transaction Type carries direction.
  const minorUnits = moneyResult.value.toMinorUnits();
  if (minorUnits <= 0n) {
    return { ok: false };
  }

  return { ok: true, minorUnits };
}

async function loanBalanceRemainsNonNegative(
  account: Account,
  type: Transaction['type'],
  amount: bigint,
  excludedTransactionId?: string
): Promise<boolean> {
  if (account.type !== 'LOAN') {
    return true;
  }

  const grouped = await getPrisma().transaction.groupBy({
    by: ['type'],
    where: {
      accountId: account.id,
      ...(excludedTransactionId === undefined ? {} : { id: { not: excludedTransactionId } }),
    },
    _sum: { amount: true },
  });
  const totals = new Map(grouped.map((row) => [row.type, row._sum.amount ?? 0n]));
  const income = totals.get('INCOME') ?? 0n;
  const expense = totals.get('EXPENSE') ?? 0n;
  const nextIncome = type === 'INCOME' ? income + amount : income;
  const nextExpense = type === 'EXPENSE' ? expense + amount : expense;

  return nextIncome >= nextExpense;
}

// Moving a transaction to an account in a lower-exponent currency (e.g. USD
// 2dp -> JPY 0dp) without a new amount would silently reinterpret the stored
// minor units. The stored value is only compatible when it has no fractional
// digits below the new currency's exponent.
function existingAmountFitsAccount(
  minorUnits: bigint,
  fromAccount: Account,
  toAccount: Account
): boolean {
  if (!isCurrencyCode(fromAccount.currency) || !isCurrencyCode(toAccount.currency)) {
    throw unexpectedValidationError('unsupported-currency');
  }
  const fromCurrency = currencyFor(fromAccount.currency);
  const toCurrency = currencyFor(toAccount.currency);
  if (fromCurrency == null || toCurrency == null) {
    throw unexpectedValidationError('unsupported-currency');
  }
  if (toCurrency.exponent >= fromCurrency.exponent) {
    return true;
  }
  const factor = 10n ** (fromCurrency.exponent - toCurrency.exponent);
  return minorUnits % factor === 0n;
}

async function resolveTransactionExchangeRate(
  accountCurrency: string,
  householdId: string,
  date: Date
) {
  const prisma = getPrisma();
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { reportingCurrency: true },
  });
  if (household === null) {
    throw unexpectedValidationError('household-not-found');
  }
  if (accountCurrency === household.reportingCurrency) {
    return { reportingCurrency: accountCurrency, exchangeRate: '1' };
  }

  const cachedRate = await prisma.exchangeRate.findUnique({
    where: {
      baseCurrency_quoteCurrency_date: {
        baseCurrency: accountCurrency,
        quoteCurrency: household.reportingCurrency,
        date,
      },
    },
  });
  if (cachedRate !== null) {
    return {
      reportingCurrency: household.reportingCurrency,
      exchangeRate: cachedRate.rate.toString(),
    };
  }

  try {
    const rate = await refreshExchangeRate(accountCurrency, household.reportingCurrency, date);
    return { reportingCurrency: household.reportingCurrency, exchangeRate: rate.rate };
  } catch {
    return null;
  }
}

export async function createTransaction(
  input: CreateTransactionInput,
  householdId: string
): Promise<CreateTransactionResult> {
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

  const amountResult = parseAmountToMinorUnits(input.amount, account);
  if (!amountResult.ok) {
    return { ok: false, error: 'invalid-amount' };
  }

  const loanBalanceIsValid = await loanBalanceRemainsNonNegative(
    account,
    mapDomainTransactionType(input.type),
    amountResult.minorUnits
  );
  if (!loanBalanceIsValid) {
    return { ok: false, error: 'loan-overpayment' };
  }

  const entityResult = createTransactionEntity({
    id: makeTransactionId(crypto.randomUUID()),
    householdId: makeHouseholdId(householdId),
    accountId: makeAccountId(account.id),
    categoryId: makeCategoryId(category.id),
    type: input.type,
    amountMinorUnits: amountResult.minorUnits,
    date: input.date,
    description: input.description,
  });

  if (!entityResult.ok) {
    return { ok: false, error: 'invalid-data' };
  }

  const exchangeRate = await resolveTransactionExchangeRate(
    account.currency,
    householdId,
    input.date
  );
  if (exchangeRate === null) {
    return { ok: false, error: 'exchange-rate-unavailable' };
  }

  const validatedTransaction = entityResult.value;
  const prisma = getPrisma();
  const transaction = await prisma.transaction.create({
    data: {
      id: validatedTransaction.id,
      householdId: validatedTransaction.householdId,
      accountId: validatedTransaction.accountId,
      categoryId: validatedTransaction.categoryId,
      type: mapDomainTransactionType(validatedTransaction.type),
      amount: validatedTransaction.amountMinorUnits,
      date: validatedTransaction.date,
      description: validatedTransaction.description,
      reportingCurrency: exchangeRate.reportingCurrency,
      exchangeRate: exchangeRate.exchangeRate,
    },
    include: { account: true, category: true },
  });

  return { ok: true, transaction: mapTransactionToRecord(transaction) };
}

export async function listTransactionsForHousehold(
  householdId: string,
  filters: TransactionFilters
): Promise<TransactionRecord[]> {
  const prisma = getPrisma();
  const dateFilter: Prisma.DateTimeFilter = {};
  if (filters.from !== undefined) {
    dateFilter.gte = filters.from;
  }
  if (filters.to !== undefined) {
    dateFilter.lte = filters.to;
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      householdId,
      ...(filters.accountId !== undefined ? { accountId: filters.accountId } : {}),
      ...(filters.from !== undefined || filters.to !== undefined ? { date: dateFilter } : {}),
    },
    include: { account: true, category: true },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });

  return transactions.map(mapTransactionToRecord);
}

export async function findTransactionById(
  transactionId: string,
  householdId: string
): Promise<TransactionRecord | null> {
  const prisma = getPrisma();
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, householdId },
    include: { account: true, category: true },
  });

  if (transaction === null) {
    return null;
  }

  return mapTransactionToRecord(transaction);
}

export async function updateTransaction(
  transactionId: string,
  householdId: string,
  input: UpdateTransactionInput
): Promise<UpdateTransactionResult> {
  const prisma = getPrisma();
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, householdId },
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
  let targetCategoryType = existing.type;
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

  const accountChanged = input.accountId !== undefined && input.accountId !== existing.accountId;
  if (accountChanged && input.amount === undefined) {
    const compatible = existingAmountFitsAccount(existing.amount, existing.account, targetAccount);
    if (!compatible) {
      return { ok: false, error: 'amount-incompatible-with-account' };
    }
  }

  const updateData: Prisma.TransactionUncheckedUpdateInput = {};

  if (input.type !== undefined) {
    updateData.type = targetType;
  }
  if (input.accountId !== undefined) {
    updateData.accountId = targetAccount.id;
  }
  if (input.categoryId !== undefined) {
    updateData.categoryId = targetCategoryId;
  }
  if (input.date !== undefined) {
    updateData.date = input.date;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  if (input.exchangeRate !== undefined) {
    updateData.exchangeRate = input.exchangeRate;
    updateData.exchangeRateOverridden = true;
  }
  let targetAmount = existing.amount;
  if (input.amount !== undefined) {
    const amountResult = parseAmountToMinorUnits(input.amount, targetAccount);
    if (!amountResult.ok) {
      return { ok: false, error: 'invalid-amount' };
    }
    targetAmount = amountResult.minorUnits;
    updateData.amount = targetAmount;
  }

  const dateChanged = input.date !== undefined && input.date.getTime() !== existing.date.getTime();
  const needsResolvedRate = (accountChanged || dateChanged) && input.exchangeRate === undefined;
  if (needsResolvedRate) {
    const targetDate = input.date ?? existing.date;
    const exchangeRate = await resolveTransactionExchangeRate(
      targetAccount.currency,
      householdId,
      targetDate
    );
    if (exchangeRate === null) {
      return { ok: false, error: 'exchange-rate-unavailable' };
    }
    updateData.reportingCurrency = exchangeRate.reportingCurrency;
    updateData.exchangeRate = exchangeRate.exchangeRate;
    updateData.exchangeRateOverridden = false;
  }

  const loanBalanceIsValid = await loanBalanceRemainsNonNegative(
    targetAccount,
    targetType,
    targetAmount,
    existing.id
  );
  if (!loanBalanceIsValid) {
    return { ok: false, error: 'loan-overpayment' };
  }

  const transaction = await prisma.transaction.update({
    where: { id: existing.id },
    data: updateData,
    include: { account: true, category: true },
  });

  return { ok: true, transaction: mapTransactionToRecord(transaction) };
}

export async function deleteTransaction(
  transactionId: string,
  householdId: string
): Promise<boolean> {
  const prisma = getPrisma();
  try {
    await prisma.transaction.delete({
      where: { id: transactionId, householdId },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return false;
    }
    throw error;
  }
}
