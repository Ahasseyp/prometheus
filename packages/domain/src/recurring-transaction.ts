import type { AccountId, CategoryId, HouseholdId, RecurringTransactionId } from './ids.js';
import type { Result } from './types.js';
import { createTimestamps } from './timestamps.js';

export const RecurrenceFrequency = {
  Weekly: 'weekly',
  Monthly: 'monthly',
  Yearly: 'yearly',
} as const;

export type RecurrenceFrequency = (typeof RecurrenceFrequency)[keyof typeof RecurrenceFrequency];

export function isRecurrenceFrequency(value: string): value is RecurrenceFrequency {
  return Object.values(RecurrenceFrequency).includes(value as RecurrenceFrequency);
}

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
  readonly frequency: RecurrenceFrequency;
  readonly description: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type RecurringTransactionError =
  | { type: 'invalid-type'; typeValue: string }
  | { type: 'invalid-frequency'; frequencyValue: string }
  | { type: 'non-positive-amount' }
  | { type: 'invalid-start-date' };

/**
 * Creates a Recurring Transaction value object, validating the transaction
 * type, frequency, positive amount, and a real start date.
 */
export function createRecurringTransaction(params: {
  id: RecurringTransactionId;
  householdId: HouseholdId;
  accountId: AccountId;
  categoryId: CategoryId;
  type: string;
  amountMinorUnits: bigint;
  startDate: Date;
  frequency: string;
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

  if (!isRecurrenceFrequency(params.frequency)) {
    return {
      ok: false,
      error: { type: 'invalid-frequency', frequencyValue: params.frequency },
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
      frequency: params.frequency,
      description: params.description ?? '',
      ...createTimestamps({ createdAt: params.createdAt, updatedAt: params.updatedAt }),
    },
  };
}
