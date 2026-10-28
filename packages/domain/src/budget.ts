import type { CategoryId, HouseholdId } from './ids.js';
import type { Money, Result } from './types.js';
import { createTimestamps } from './timestamps.js';

export const BudgetPeriod = {
  Weekly: 'weekly',
  Monthly: 'monthly',
  Yearly: 'yearly',
} as const;

export type BudgetPeriod = (typeof BudgetPeriod)[keyof typeof BudgetPeriod];

export function isBudgetPeriod(value: string): value is BudgetPeriod {
  return Object.values(BudgetPeriod).includes(value as BudgetPeriod);
}

/**
 * A planned spending limit for one or more expense Categories over a Budget
 * Period. The limit is denominated in the Household's Reporting Currency and
 * must be positive; at least one Category is required (issue #27).
 */
export type Budget = {
  readonly id: string;
  readonly householdId: HouseholdId;
  readonly name: string;
  readonly limit: Money;
  readonly period: BudgetPeriod;
  readonly categoryIds: readonly CategoryId[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type BudgetError =
  | { type: 'invalid-period'; periodValue: string }
  | { type: 'no-categories' }
  | { type: 'non-positive-limit' };

/**
 * Creates a Budget value object, validating the period, that at least one
 * Category is assigned, and that the limit is positive.
 */
export function createBudget(params: {
  id: string;
  householdId: HouseholdId;
  name?: string;
  limit: Money;
  period: string;
  categoryIds: readonly CategoryId[];
  createdAt?: Date;
  updatedAt?: Date;
}): Result<Budget, BudgetError> {
  if (!isBudgetPeriod(params.period)) {
    return { ok: false, error: { type: 'invalid-period', periodValue: params.period } };
  }

  if (params.categoryIds.length === 0) {
    return { ok: false, error: { type: 'no-categories' } };
  }

  if (!params.limit.isPositive()) {
    return { ok: false, error: { type: 'non-positive-limit' } };
  }

  return {
    ok: true,
    value: {
      id: params.id,
      householdId: params.householdId,
      name: params.name?.trim() ?? '',
      limit: params.limit,
      period: params.period,
      categoryIds: params.categoryIds,
      ...createTimestamps({ createdAt: params.createdAt, updatedAt: params.updatedAt }),
    },
  };
}
