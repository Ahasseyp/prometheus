import {
  convertMoney,
  createMoneyFromMinorUnits,
  isCurrencyCode,
  periodBoundsFor,
  shiftPeriod,
} from '@prometheus/domain';
import type { CurrencyCode, Money, PeriodBounds } from '@prometheus/domain';

import { getPrisma } from '../prisma.js';
import { expectMoney } from '../lib/money.js';
import { mapPrismaBudgetPeriod } from '../lib/budget-period.js';

export type BudgetProgress = {
  id: string;
  name: string;
  currency: string;
  period: PeriodBounds;
  limit: string;
  rollover: string;
  available: string;
  spent: string;
  remaining: string;
};

export type GetBudgetProgressResult =
  | { ok: true; progress: BudgetProgress }
  | { ok: false; error: 'not-found' | 'unconvertible-transactions' };

// Safety bound for the rollover walk: weekly rollover covers more than a
// century, so any real budget terminates well before this.
const MAX_PERIOD_ITERATIONS = 6000;

function zeroMoney(currency: CurrencyCode): Money {
  return expectMoney(createMoneyFromMinorUnits(0n, currency));
}

/**
 * Converts a single expense Transaction to the reporting currency using only
 * its stored historical conversion (issue #27, ADR-0002): the
 * Reporting Currency and Exchange Rate snapshotted at creation, including
 * user overrides. A transaction without a usable stored conversion is
 * reported as unconvertible so the caller sees the gap instead of a silent
 * skip.
 */
function convertTransactionAmount(
  transaction: {
    amount: bigint;
    reportingCurrency: string | null;
    exchangeRate: { toString(): string } | null;
  },
  accountCurrency: string,
  reportingCurrency: CurrencyCode
): Money | 'unconvertible' {
  if (!isCurrencyCode(accountCurrency)) {
    throw new Error(`Unexpected unsupported account currency: ${accountCurrency}`);
  }
  const amount = expectMoney(createMoneyFromMinorUnits(transaction.amount, accountCurrency));
  const sameCurrency = accountCurrency === reportingCurrency;

  if (transaction.reportingCurrency === reportingCurrency) {
    // Same-currency transactions always snapshot a rate of 1; tolerate
    // legacy rows that left it null.
    if (transaction.exchangeRate !== null) {
      return expectMoney(
        convertMoney(amount, transaction.exchangeRate.toString(), reportingCurrency)
      );
    }
    return sameCurrency ? amount : 'unconvertible';
  }

  // The stored conversion targets a different currency (the Household changed
  // its Reporting Currency after the Transaction was recorded). Only
  // transactions already denominated in the reporting currency can still be
  // measured.
  return sameCurrency ? amount : 'unconvertible';
}

/**
 * Current-period progress for a Budget: spent measured from expense
 * Transactions in the Budget's Categories, converted at each Transaction's
 * stored transaction-date Exchange Rate, plus the unused amounts of every
 * period since the Budget was created carried forward as rollover.
 * Overspending contributes nothing (never a negative rollover).
 */
export async function getBudgetProgress(
  budgetId: string,
  householdId: string,
  date: Date
): Promise<GetBudgetProgressResult> {
  const prisma = getPrisma();
  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, householdId },
    include: { categories: true, household: true },
  });
  if (budget === null) {
    return { ok: false, error: 'not-found' };
  }

  const reportingCurrency = budget.household.reportingCurrency;
  if (!isCurrencyCode(reportingCurrency)) {
    throw new Error(`Unexpected unsupported reporting currency: ${reportingCurrency}`);
  }
  const categoryIds = budget.categories.map((entry) => entry.categoryId);
  const period = mapPrismaBudgetPeriod(budget.period);
  const currentPeriod = periodBoundsFor(date, period);

  const sumSpent = async (bounds: PeriodBounds): Promise<Money | 'unconvertible'> => {
    const transactions = await prisma.transaction.findMany({
      where: {
        householdId,
        type: 'EXPENSE',
        categoryId: { in: categoryIds },
        date: { gte: bounds.start, lt: bounds.end },
      },
      include: { account: true },
    });

    let total = zeroMoney(reportingCurrency);
    for (const transaction of transactions) {
      const converted = convertTransactionAmount(
        transaction,
        transaction.account.currency,
        reportingCurrency
      );
      if (converted === 'unconvertible') {
        return 'unconvertible';
      }
      total = expectMoney(total.add(converted));
    }
    return total;
  };

  const currentSpent = await sumSpent(currentPeriod);
  if (currentSpent === 'unconvertible') {
    return { ok: false, error: 'unconvertible-transactions' };
  }

  const limit = expectMoney(createMoneyFromMinorUnits(budget.limit, reportingCurrency));

  let rollover = zeroMoney(reportingCurrency);
  let cursor = periodBoundsFor(budget.createdAt, period);
  let iterations = 0;
  while (cursor.start.getTime() < currentPeriod.start.getTime()) {
    iterations += 1;
    if (iterations > MAX_PERIOD_ITERATIONS) {
      throw new Error('Unexpected rollover period iteration overflow');
    }

    const spent = await sumSpent(cursor);
    if (spent === 'unconvertible') {
      return { ok: false, error: 'unconvertible-transactions' };
    }

    const unused = expectMoney(limit.subtract(spent));
    if (unused.isPositive()) {
      rollover = expectMoney(rollover.add(unused));
    }

    cursor = shiftPeriod(cursor, period, 1);
  }

  const available = expectMoney(rollover.add(limit));
  const remaining = expectMoney(available.subtract(currentSpent));

  return {
    ok: true,
    progress: {
      id: budget.id,
      name: budget.name,
      currency: reportingCurrency,
      period: currentPeriod,
      limit: limit.toDecimal(),
      rollover: rollover.toDecimal(),
      available: available.toDecimal(),
      spent: currentSpent.toDecimal(),
      remaining: remaining.toDecimal(),
    },
  };
}
