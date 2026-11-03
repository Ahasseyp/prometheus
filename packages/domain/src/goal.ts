import { AccountType } from './account.js';
import type { AccountId, GoalContributionId, GoalId, HouseholdId } from './ids.js';
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

/**
 * A Goal Contribution moves Money from an Account's Unallocated Balance into
 * a Goal's saved amount (issue #28). It never creates a Transaction; the
 * amount is earmarked while the Contribution exists. The amount's Currency
 * must match both the Goal and the funding Account — the service validates
 * that, since it can see all three records.
 */
export type GoalContribution = {
  readonly id: string;
  readonly goalId: GoalId;
  readonly accountId: AccountId;
  readonly amount: Money;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type GoalContributionError = { type: 'non-positive-amount' };

// A Contribution earmarks money you have; funding one from debt (Credit Card,
// Loan) would mean borrowing toward the Goal.
const contributionFundingTypes: readonly AccountType[] = [
  AccountType.Checking,
  AccountType.Savings,
  AccountType.Cash,
  AccountType.Investment,
];

export function isContributionFundingType(type: AccountType): boolean {
  return contributionFundingTypes.includes(type);
}

/**
 * Creates a Goal Contribution value object, validating that the amount is
 * positive.
 */
export function createGoalContribution(params: {
  id: GoalContributionId;
  goalId: GoalId;
  accountId: AccountId;
  amount: Money;
  createdAt?: Date;
  updatedAt?: Date;
}): Result<GoalContribution, GoalContributionError> {
  if (!params.amount.isPositive()) {
    return { ok: false, error: { type: 'non-positive-amount' } };
  }

  return {
    ok: true,
    value: {
      id: params.id,
      goalId: params.goalId,
      accountId: params.accountId,
      amount: params.amount,
      ...createTimestamps({ createdAt: params.createdAt, updatedAt: params.updatedAt }),
    },
  };
}
