import crypto from 'node:crypto';

import {
  createGoalContribution as createGoalContributionEntity,
  createMoney,
  createMoneyFromMinorUnits,
  isCurrencyCode,
  makeAccountId,
  makeGoalContributionId,
  makeGoalId,
} from '@prometheus/domain';
import type { CurrencyCode, Money } from '@prometheus/domain';
import { Prisma } from '@prisma/client';
import type { Account, Goal, GoalContribution } from '@prisma/client';

import { getPrisma } from '../prisma.js';
import { expectMoney, minorUnitsToDecimal } from '../lib/money.js';
import { getUnallocatedBalance } from './account.js';

export type CreateGoalContributionInput = {
  goalId: string;
  accountId: string;
  amount: string;
};

export type UpdateGoalContributionInput = {
  amount?: string;
  accountId?: string;
};

export type GoalContributionRecord = {
  id: string;
  householdId: string;
  goalId: string;
  accountId: string;
  amount: string;
  createdAt: Date;
  updatedAt: Date;
};

export type GoalContributionValidationError =
  | 'invalid-data'
  | 'goal-not-found'
  | 'account-not-found'
  | 'currency-mismatch'
  | 'insufficient-unallocated';

export type SaveGoalContributionResult =
  | { ok: true; contribution: GoalContributionRecord }
  | { ok: false; error: GoalContributionValidationError };

export type UpdateGoalContributionResult =
  | { ok: true; contribution: GoalContributionRecord }
  | { ok: false; error: GoalContributionValidationError | 'not-found' };

export type DeleteGoalContributionResult = { ok: true } | { ok: false; error: 'not-found' };

// The tRPC layer validates first.
function unexpectedValidationError(reason: string): Error {
  return new Error(`Unexpected goal contribution validation failure: ${reason}`);
}

function mapContributionToRecord(
  contribution: GoalContribution,
  currency: string
): GoalContributionRecord {
  if (!isCurrencyCode(currency)) {
    throw unexpectedValidationError(`unsupported-currency:${currency}`);
  }
  return {
    id: contribution.id,
    householdId: contribution.householdId,
    goalId: contribution.goalId,
    accountId: contribution.accountId,
    amount: minorUnitsToDecimal(contribution.amount, currency),
    createdAt: contribution.createdAt,
    updatedAt: contribution.updatedAt,
  };
}

function buildAmountMoney(amount: string, currency: string): Money | null {
  if (!isCurrencyCode(currency)) {
    return null;
  }
  const moneyResult = createMoney(amount, currency as CurrencyCode);
  if (!moneyResult.ok) {
    return null;
  }
  return moneyResult.value;
}

function moneyInCurrency(minorUnits: bigint, currency: string): Money {
  if (!isCurrencyCode(currency)) {
    throw unexpectedValidationError(`unsupported-currency:${currency}`);
  }
  return expectMoney(createMoneyFromMinorUnits(minorUnits, currency));
}

async function validateFundingAccount(
  goal: Pick<Goal, 'id' | 'currency'>,
  accountId: string,
  householdId: string
): Promise<{ ok: true; account: Account } | { ok: false; error: GoalContributionValidationError }> {
  const prisma = getPrisma();
  const account = await prisma.account.findFirst({ where: { id: accountId, householdId } });
  if (account === null) {
    return { ok: false, error: 'account-not-found' };
  }
  if (account.currency !== goal.currency) {
    return { ok: false, error: 'currency-mismatch' };
  }
  return { ok: true, account };
}

function ensureFitsUnallocated(amount: Money, unallocated: Money): boolean {
  const comparison = amount.compare(unallocated);
  if (!comparison.ok) {
    throw unexpectedValidationError(comparison.error.type);
  }
  return comparison.value <= 0;
}

export async function createGoalContribution(
  input: CreateGoalContributionInput,
  householdId: string
): Promise<SaveGoalContributionResult> {
  const prisma = getPrisma();
  const goal = await prisma.goal.findFirst({ where: { id: input.goalId, householdId } });
  if (goal === null) {
    return { ok: false, error: 'goal-not-found' };
  }

  const accountResult = await validateFundingAccount(goal, input.accountId, householdId);
  if (!accountResult.ok) {
    return { ok: false, error: accountResult.error };
  }

  const amount = buildAmountMoney(input.amount, goal.currency);
  if (amount === null || !amount.isPositive()) {
    return { ok: false, error: 'invalid-data' };
  }

  const entityResult = createGoalContributionEntity({
    id: makeGoalContributionId(crypto.randomUUID()),
    goalId: makeGoalId(goal.id),
    accountId: makeAccountId(accountResult.account.id),
    amount,
  });
  if (!entityResult.ok) {
    return { ok: false, error: 'invalid-data' };
  }

  const unallocated = await getUnallocatedBalance(accountResult.account);
  if (!ensureFitsUnallocated(amount, unallocated)) {
    return { ok: false, error: 'insufficient-unallocated' };
  }

  const contribution = await prisma.goalContribution.create({
    data: {
      id: entityResult.value.id,
      householdId,
      goalId: goal.id,
      accountId: accountResult.account.id,
      amount: amount.toMinorUnits(),
    },
  });

  return { ok: true, contribution: mapContributionToRecord(contribution, goal.currency) };
}

export async function listGoalContributions(
  goalId: string,
  householdId: string
): Promise<GoalContributionRecord[] | null> {
  const prisma = getPrisma();
  const goal = await prisma.goal.findFirst({ where: { id: goalId, householdId } });
  if (goal === null) {
    return null;
  }

  const contributions = await prisma.goalContribution.findMany({
    where: { goalId },
    orderBy: { createdAt: 'asc' },
  });

  return contributions.map((contribution) => mapContributionToRecord(contribution, goal.currency));
}

export async function findGoalContributionById(
  contributionId: string,
  householdId: string
): Promise<GoalContributionRecord | null> {
  const prisma = getPrisma();
  const contribution = await prisma.goalContribution.findFirst({
    where: { id: contributionId, householdId },
    include: { goal: true },
  });

  if (contribution === null) {
    return null;
  }

  return mapContributionToRecord(contribution, contribution.goal.currency);
}

export async function updateGoalContribution(
  contributionId: string,
  householdId: string,
  input: UpdateGoalContributionInput
): Promise<UpdateGoalContributionResult> {
  const prisma = getPrisma();
  const existing = await prisma.goalContribution.findFirst({
    where: { id: contributionId, householdId },
  });
  if (existing === null) {
    return { ok: false, error: 'not-found' };
  }

  const goal = await prisma.goal.findFirst({ where: { id: existing.goalId, householdId } });
  if (goal === null) {
    return { ok: false, error: 'goal-not-found' };
  }

  const accountResult = await validateFundingAccount(
    goal,
    input.accountId ?? existing.accountId,
    householdId
  );
  if (!accountResult.ok) {
    return { ok: false, error: accountResult.error };
  }

  let nextAmount = moneyInCurrency(existing.amount, goal.currency);
  if (input.amount !== undefined) {
    const amount = buildAmountMoney(input.amount, goal.currency);
    if (amount === null || !amount.isPositive()) {
      return { ok: false, error: 'invalid-data' };
    }
    nextAmount = amount;
  }

  // Editing moves earmarked Money between Accounts or resizes it; the
  // exclusion treats this Contribution as already removed so its own amount
  // never counts against it on its new (or unchanged) Account.
  const unallocated = await getUnallocatedBalance(accountResult.account, contributionId);
  if (!ensureFitsUnallocated(nextAmount, unallocated)) {
    return { ok: false, error: 'insufficient-unallocated' };
  }

  const contribution = await prisma.goalContribution.update({
    where: { id: contributionId },
    data: {
      accountId: accountResult.account.id,
      amount: nextAmount.toMinorUnits(),
    },
  });

  return { ok: true, contribution: mapContributionToRecord(contribution, goal.currency) };
}

export async function deleteGoalContribution(
  contributionId: string,
  householdId: string
): Promise<DeleteGoalContributionResult> {
  const prisma = getPrisma();
  try {
    await prisma.goalContribution.delete({ where: { id: contributionId, householdId } });
    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return { ok: false, error: 'not-found' };
    }
    throw error;
  }
}
