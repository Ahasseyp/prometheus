import type { AccountId, CategoryId, HouseholdId, RecurringTransactionId } from './ids.js';
import type { Result } from './types.js';
import { createTimestamps } from './timestamps.js';

export const RecurrencePeriod = {
  Week: 'week',
  Month: 'month',
  Year: 'year',
} as const;

export type RecurrencePeriod = (typeof RecurrencePeriod)[keyof typeof RecurrencePeriod];

export function isRecurrencePeriod(value: string): value is RecurrencePeriod {
  return Object.values(RecurrencePeriod).includes(value as RecurrencePeriod);
}

export const DEFAULT_RECURRENCE_INTERVAL = 1;

/**
 * A schedule that defines repeated income or expense Transactions, used to
 * generate individual Transaction Instances (issue #29). A generated instance
 * can be skipped without breaking the schedule.
 */
export type RecurringTransaction = {
  readonly id: RecurringTransactionId;
  readonly householdId: HouseholdId;
  readonly accountId: AccountId;
  readonly categoryId: CategoryId;
  readonly type: 'income' | 'expense';
  readonly amountMinorUnits: bigint;
  readonly startDate: Date;
  readonly period: RecurrencePeriod;
  readonly interval: number;
  readonly description: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type RecurringTransactionError =
  | { type: 'invalid-type'; typeValue: string }
  | { type: 'invalid-period'; periodValue: string }
  | { type: 'invalid-interval'; intervalValue: number }
  | { type: 'non-positive-amount' }
  | { type: 'invalid-start-date' };

/**
 * Creates a Recurring Transaction value object, validating the transaction
 * type, recurrence period, positive interval, positive amount, and a real start
 * date.
 */
export function createRecurringTransaction(params: {
  id: RecurringTransactionId;
  householdId: HouseholdId;
  accountId: AccountId;
  categoryId: CategoryId;
  type: string;
  amountMinorUnits: bigint;
  startDate: Date;
  period: string;
  interval: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}): Result<RecurringTransaction, RecurringTransactionError> {
  if (params.type !== 'income' && params.type !== 'expense') {
    return {
      ok: false,
      error: { type: 'invalid-type', typeValue: params.type },
    };
  }

  if (!isRecurrencePeriod(params.period)) {
    return {
      ok: false,
      error: { type: 'invalid-period', periodValue: params.period },
    };
  }

  if (!Number.isInteger(params.interval) || params.interval < 1) {
    return {
      ok: false,
      error: { type: 'invalid-interval', intervalValue: params.interval },
    };
  }

  if (Number.isNaN(params.startDate.getTime())) {
    return { ok: false, error: { type: 'invalid-start-date' } };
  }

  if (params.amountMinorUnits <= 0n) {
    return { ok: false, error: { type: 'non-positive-amount' } };
  }

  return {
    ok: true,
    value: {
      id: params.id,
      householdId: params.householdId,
      accountId: params.accountId,
      categoryId: params.categoryId,
      type: params.type,
      amountMinorUnits: params.amountMinorUnits,
      startDate: params.startDate,
      period: params.period,
      interval: params.interval,
      description: params.description ?? '',
      ...createTimestamps({ createdAt: params.createdAt, updatedAt: params.updatedAt }),
    },
  };
}
