import type { HouseholdId, GoalId } from './ids.js';
import type { Money, Result } from './types.js';
import { createTimestamps } from './timestamps.js';

/**
 * A savings Goal earmarks Money from Account Balances through Goal
 * Contributions without creating Transactions (issue #28). The target is
 * denominated in the Goal's Currency, which is fixed after creation
 * (ADR-0002); the saved amount is derived from Goal Contributions.
 */
export type Goal = {
  readonly id: string;
  readonly householdId: HouseholdId;
  readonly name: string;
  readonly target: Money;
  readonly deadline: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type GoalError =
  { type: 'empty-name' } | { type: 'non-positive-target' } | { type: 'invalid-deadline' };

/**
 * Creates a Goal value object, validating that the name is non-empty, the
 * target is positive, and the deadline is a real date. The Goal Currency is
 * the target Money's Currency.
 */
export function createGoal(params: {
  id: GoalId;
  householdId: HouseholdId;
  name: string;
  target: Money;
  deadline: Date;
  createdAt?: Date;
  updatedAt?: Date;
}): Result<Goal, GoalError> {
  if (params.name.trim().length === 0) {
    return { ok: false, error: { type: 'empty-name' } };
  }

  if (!params.target.isPositive()) {
    return { ok: false, error: { type: 'non-positive-target' } };
  }

  if (Number.isNaN(params.deadline.getTime())) {
    return { ok: false, error: { type: 'invalid-deadline' } };
  }

  return {
    ok: true,
    value: {
      id: params.id,
      householdId: params.householdId,
      name: params.name.trim(),
      target: params.target,
      deadline: params.deadline,
      ...createTimestamps({ createdAt: params.createdAt, updatedAt: params.updatedAt }),
    },
  };
}
