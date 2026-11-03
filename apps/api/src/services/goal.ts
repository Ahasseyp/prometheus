import crypto from 'node:crypto';

import {
  createGoal as createGoalEntity,
  createMoney,
  isCurrencyCode,
  makeGoalId,
  makeHouseholdId,
} from '@prometheus/domain';
import type { CurrencyCode } from '@prometheus/domain';
import { Prisma } from '@prisma/client';
import type { Goal } from '@prisma/client';

import { getPrisma } from '../prisma.js';
import { minorUnitsToDecimal } from '../lib/money.js';

export type CreateGoalInput = {
  name: string;
  target: string;
  currency: string;
  deadline: Date;
};

export type UpdateGoalInput = {
  name?: string;
  target?: string;
  deadline?: Date;
};

export type GoalRecord = {
  id: string;
  householdId: string;
  name: string;
  target: string;
  currency: string;
  deadline: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type GoalValidationError = 'invalid-data';

export type CreateGoalResult =
  { ok: true; goal: GoalRecord } | { ok: false; error: GoalValidationError };

export type UpdateGoalResult =
  { ok: true; goal: GoalRecord } | { ok: false; error: GoalValidationError | 'not-found' };

export type DeleteGoalResult = { ok: true } | { ok: false; error: 'not-found' };

// The tRPC layer validates first.
function unexpectedValidationError(reason: string): Error {
  return new Error(`Unexpected goal validation failure: ${reason}`);
}

function mapGoalToRecord(goal: Goal): GoalRecord {
  if (!isCurrencyCode(goal.currency)) {
    throw unexpectedValidationError(`unsupported-currency:${goal.currency}`);
  }
  return {
    id: goal.id,
    householdId: goal.householdId,
    name: goal.name,
    target: minorUnitsToDecimal(goal.target, goal.currency),
    currency: goal.currency,
    deadline: goal.deadline,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

function buildTargetMoney(target: string, currency: string) {
  if (!isCurrencyCode(currency)) {
    return null;
  }
  const moneyResult = createMoney(target, currency as CurrencyCode);
  if (!moneyResult.ok) {
    return null;
  }
  return moneyResult.value;
}

export async function createGoal(
  input: CreateGoalInput,
  householdId: string
): Promise<CreateGoalResult> {
  const target = buildTargetMoney(input.target, input.currency);
  if (target === null || !target.isPositive()) {
    return { ok: false, error: 'invalid-data' };
  }

  const entityResult = createGoalEntity({
    id: makeGoalId(crypto.randomUUID()),
    householdId: makeHouseholdId(householdId),
    name: input.name,
    target,
    deadline: input.deadline,
  });

  if (!entityResult.ok) {
    return { ok: false, error: 'invalid-data' };
  }

  const validatedGoal = entityResult.value;
  const prisma = getPrisma();
  const goal = await prisma.goal.create({
    data: {
      id: validatedGoal.id,
      householdId: validatedGoal.householdId,
      name: validatedGoal.name,
      target: validatedGoal.target.toMinorUnits(),
      currency: validatedGoal.target.currency,
      deadline: validatedGoal.deadline,
    },
  });

  return { ok: true, goal: mapGoalToRecord(goal) };
}

export async function listGoalsForHousehold(householdId: string): Promise<GoalRecord[]> {
  const prisma = getPrisma();
  const goals = await prisma.goal.findMany({
    where: { householdId },
    orderBy: { createdAt: 'asc' },
  });

  return goals.map(mapGoalToRecord);
}

export async function findGoalById(
  goalId: string,
  householdId: string
): Promise<GoalRecord | null> {
  const prisma = getPrisma();
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, householdId },
  });

  if (goal === null) {
    return null;
  }

  return mapGoalToRecord(goal);
}

export async function updateGoal(
  goalId: string,
  householdId: string,
  input: UpdateGoalInput
): Promise<UpdateGoalResult> {
  const prisma = getPrisma();
  const existing = await prisma.goal.findFirst({
    where: { id: goalId, householdId },
  });
  if (existing === null) {
    return { ok: false, error: 'not-found' };
  }

  const updateData: Partial<Pick<Goal, 'name' | 'target' | 'deadline'>> = {};

  if (input.name !== undefined) {
    const trimmedName = input.name.trim();
    if (trimmedName === '') {
      return { ok: false, error: 'invalid-data' };
    }
    updateData.name = trimmedName;
  }

  // Goal Currency is fixed after creation (ADR-0002); the update path
  // deliberately omits it, so target edits stay in the existing Currency.
  if (input.target !== undefined) {
    const target = buildTargetMoney(input.target, existing.currency);
    if (target === null || !target.isPositive()) {
      return { ok: false, error: 'invalid-data' };
    }
    updateData.target = target.toMinorUnits();
  }

  if (input.deadline !== undefined) {
    if (Number.isNaN(input.deadline.getTime())) {
      return { ok: false, error: 'invalid-data' };
    }
    updateData.deadline = input.deadline;
  }

  const goal = await prisma.goal.update({
    where: { id: goalId },
    data: updateData,
  });

  return { ok: true, goal: mapGoalToRecord(goal) };
}

export async function deleteGoal(goalId: string, householdId: string): Promise<DeleteGoalResult> {
  const prisma = getPrisma();
  try {
    await prisma.goal.delete({ where: { id: goalId, householdId } });
    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return { ok: false, error: 'not-found' };
    }
    throw error;
  }
}
