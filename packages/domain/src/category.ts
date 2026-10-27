import type { CategoryId, HouseholdId } from './ids.js';
import type { Result } from './types.js';
import { createTimestamps } from './timestamps.js';
import { TransactionType } from './transaction.js';

/**
 * A label that classifies a Transaction by what it represents. A System
 * Category is provided by the app and can be renamed but not deleted; a
 * Custom Category is created by the Household. Categories nest at most one
 * level deep (Category + Subcategory).
 */
export type Category = {
  readonly id: CategoryId;
  readonly householdId: HouseholdId;
  readonly name: string;
  readonly type: TransactionType;
  readonly isSystem: boolean;
  readonly parentId: CategoryId | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CategoryError = { type: 'empty-name' } | { type: 'invalid-type'; typeValue: string };

/**
 * Creates a Category value object, validating the name and type.
 */
export function createCategory(params: {
  id: CategoryId;
  householdId: HouseholdId;
  name: string;
  type: string;
  isSystem: boolean;
  parentId?: CategoryId | null;
  createdAt?: Date;
  updatedAt?: Date;
}): Result<Category, CategoryError> {
  const trimmedName = params.name.trim();
  if (trimmedName === '') {
    return { ok: false, error: { type: 'empty-name' } };
  }

  if (!Object.values(TransactionType).includes(params.type as TransactionType)) {
    return {
      ok: false,
      error: { type: 'invalid-type', typeValue: params.type },
    };
  }

  return {
    ok: true,
    value: {
      id: params.id,
      householdId: params.householdId,
      name: trimmedName,
      type: params.type as TransactionType,
      isSystem: params.isSystem,
      parentId: params.parentId ?? null,
      ...createTimestamps({ createdAt: params.createdAt, updatedAt: params.updatedAt }),
    },
  };
}
