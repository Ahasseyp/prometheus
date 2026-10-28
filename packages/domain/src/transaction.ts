import type { AccountId, CategoryId, HouseholdId, TransactionId } from './ids.js';
import type { Result } from './types.js';
import { createTimestamps } from './timestamps.js';

export const TransactionType = {
  Income: 'income',
  Expense: 'expense',
  Transfer: 'transfer',
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

function isTransactionType(value: string): value is TransactionType {
  return Object.values(TransactionType).includes(value as TransactionType);
}

/**
 * A movement of Money into or out of an Account. The amount is stored in
 * minor units of the Account Currency and is always positive; the type
 * carries the direction. Transfer Transactions have no Category; the Transfer
 * record links the source and destination pair (issue #26).
 */
export type Transaction = {
  readonly id: TransactionId;
  readonly householdId: HouseholdId;
  readonly accountId: AccountId;
  readonly categoryId: CategoryId | null;
  readonly type: TransactionType;
  readonly amountMinorUnits: bigint;
  readonly date: Date;
  readonly description: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type TransactionError =
  { type: 'invalid-type'; typeValue: string } | { type: 'non-positive-amount' };

/**
 * Creates a Transaction value object, validating the type and that the
 * amount in minor units is positive.
 */
export function createTransaction(params: {
  id: TransactionId;
  householdId: HouseholdId;
  accountId: AccountId;
  categoryId: CategoryId | null;
  type: string;
  amountMinorUnits: bigint;
  date: Date;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}): Result<Transaction, TransactionError> {
  if (!isTransactionType(params.type)) {
    return {
      ok: false,
      error: { type: 'invalid-type', typeValue: params.type },
    };
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
      date: params.date,
      description: params.description ?? '',
      ...createTimestamps({ createdAt: params.createdAt, updatedAt: params.updatedAt }),
    },
  };
}
