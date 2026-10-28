import crypto from 'node:crypto';

import {
  createBudget as createBudgetEntity,
  createMoney,
  isBudgetPeriod,
  isCurrencyCode,
  makeBudgetId,
  makeCategoryId,
  makeHouseholdId,
} from '@prometheus/domain';
import type { BudgetPeriod as DomainBudgetPeriod, CurrencyCode } from '@prometheus/domain';
import { Prisma } from '@prisma/client';
import type { Budget, BudgetCategory } from '@prisma/client';

import { getPrisma } from '../prisma.js';
import { minorUnitsToDecimal } from '../lib/money.js';
import { mapDomainBudgetPeriod, mapPrismaBudgetPeriod } from '../lib/budget-period.js';

export type CreateBudgetInput = {
  name?: string;
  limit: string;
  period: string;
  categoryIds: string[];
};

export type UpdateBudgetInput = {
  name?: string;
  limit?: string;
  period?: string;
  categoryIds?: string[];
};

export type BudgetRecord = {
  id: string;
  householdId: string;
  name: string;
  limit: string;
  period: DomainBudgetPeriod;
  categoryIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type BudgetValidationError = 'invalid-data' | 'category-not-found' | 'category-not-expense';

export type CreateBudgetResult =
  { ok: true; budget: BudgetRecord } | { ok: false; error: BudgetValidationError };

export type UpdateBudgetResult =
  { ok: true; budget: BudgetRecord } | { ok: false; error: BudgetValidationError | 'not-found' };

export type DeleteBudgetResult = { ok: true } | { ok: false; error: 'not-found' };

type BudgetWithCategories = Budget & { categories: BudgetCategory[] };

// The tRPC layer validates first.
function unexpectedValidationError(reason: string): Error {
  return new Error(`Unexpected budget validation failure: ${reason}`);
}

function mapBudgetToRecord(
  budget: BudgetWithCategories,
  reportingCurrency: CurrencyCode
): BudgetRecord {
  return {
    id: budget.id,
    householdId: budget.householdId,
    name: budget.name,
    limit: minorUnitsToDecimal(budget.limit, reportingCurrency),
    period: mapPrismaBudgetPeriod(budget.period),
    categoryIds: budget.categories.map((entry) => entry.categoryId),
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
}

async function getReportingCurrency(householdId: string): Promise<CurrencyCode> {
  const prisma = getPrisma();
  const household = await prisma.household.findFirst({ where: { id: householdId } });
  if (household === null || !isCurrencyCode(household.reportingCurrency)) {
    throw unexpectedValidationError('missing-household');
  }
  return household.reportingCurrency;
}

function buildLimitMoney(limit: string, reportingCurrency: CurrencyCode) {
  const moneyResult = createMoney(limit, reportingCurrency);
  if (!moneyResult.ok) {
    return null;
  }
  return moneyResult.value;
}

/**
 * Verifies every Category belongs to the Household and is an expense Category.
 * Category ids are deduplicated before use.
 */
async function validateCategories(
  categoryIds: string[],
  householdId: string
): Promise<{ ok: true; categoryIds: string[] } | { ok: false; error: BudgetValidationError }> {
  const uniqueIds = [...new Set(categoryIds)];
  if (uniqueIds.length === 0) {
    return { ok: false, error: 'invalid-data' };
  }

  const prisma = getPrisma();
  const categories = await prisma.category.findMany({
    where: { id: { in: uniqueIds }, householdId },
  });

  if (categories.length !== uniqueIds.length) {
    return { ok: false, error: 'category-not-found' };
  }

  if (categories.some((category) => category.type !== 'EXPENSE')) {
    return { ok: false, error: 'category-not-expense' };
  }

  return { ok: true, categoryIds: uniqueIds };
}

export async function createBudget(
  input: CreateBudgetInput,
  householdId: string
): Promise<CreateBudgetResult> {
  const reportingCurrency = await getReportingCurrency(householdId);

  const categoriesResult = await validateCategories(input.categoryIds, householdId);
  if (!categoriesResult.ok) {
    return { ok: false, error: categoriesResult.error };
  }

  const limit = buildLimitMoney(input.limit, reportingCurrency);
  if (limit === null) {
    return { ok: false, error: 'invalid-data' };
  }

  const entityResult = createBudgetEntity({
    id: makeBudgetId(crypto.randomUUID()),
    householdId: makeHouseholdId(householdId),
    name: input.name,
    limit,
    period: input.period,
    categoryIds: categoriesResult.categoryIds.map(makeCategoryId),
  });

  if (!entityResult.ok) {
    return { ok: false, error: 'invalid-data' };
  }

  const prisma = getPrisma();
  const budget = await prisma.budget.create({
    data: {
      id: entityResult.value.id,
      householdId: entityResult.value.householdId,
      name: entityResult.value.name,
      limit: entityResult.value.limit.toMinorUnits(),
      period: mapDomainBudgetPeriod(entityResult.value.period),
      categories: {
        create: categoriesResult.categoryIds.map((categoryId) => ({ categoryId })),
      },
    },
    include: { categories: true },
  });

  return { ok: true, budget: mapBudgetToRecord(budget, reportingCurrency) };
}

export async function listBudgetsForHousehold(householdId: string): Promise<BudgetRecord[]> {
  const reportingCurrency = await getReportingCurrency(householdId);

  const prisma = getPrisma();
  const budgets = await prisma.budget.findMany({
    where: { householdId },
    orderBy: { createdAt: 'asc' },
    include: { categories: true },
  });

  return budgets.map((budget) => mapBudgetToRecord(budget, reportingCurrency));
}

export async function findBudgetById(
  budgetId: string,
  householdId: string
): Promise<BudgetRecord | null> {
  const reportingCurrency = await getReportingCurrency(householdId);

  const prisma = getPrisma();
  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, householdId },
    include: { categories: true },
  });

  if (budget === null) {
    return null;
  }

  return mapBudgetToRecord(budget, reportingCurrency);
}

export async function updateBudget(
  budgetId: string,
  householdId: string,
  input: UpdateBudgetInput
): Promise<UpdateBudgetResult> {
  const prisma = getPrisma();
  const existing = await prisma.budget.findFirst({
    where: { id: budgetId, householdId },
  });
  if (existing === null) {
    return { ok: false, error: 'not-found' };
  }

  const reportingCurrency = await getReportingCurrency(householdId);

  let limitMinorUnits = existing.limit;
  if (input.limit !== undefined) {
    const limit = buildLimitMoney(input.limit, reportingCurrency);
    if (limit === null || !limit.isPositive()) {
      return { ok: false, error: 'invalid-data' };
    }
    limitMinorUnits = limit.toMinorUnits();
  }

  let period = existing.period;
  if (input.period !== undefined) {
    if (!isBudgetPeriod(input.period)) {
      return { ok: false, error: 'invalid-data' };
    }
    period = mapDomainBudgetPeriod(input.period);
  }

  let categoryIds: string[] | undefined;
  if (input.categoryIds !== undefined) {
    const categoriesResult = await validateCategories(input.categoryIds, householdId);
    if (!categoriesResult.ok) {
      return { ok: false, error: categoriesResult.error };
    }
    categoryIds = categoriesResult.categoryIds;
  }

  const budget = await prisma.$transaction(async (tx) => {
    if (categoryIds !== undefined) {
      await tx.budgetCategory.deleteMany({ where: { budgetId } });
      await tx.budgetCategory.createMany({
        data: categoryIds.map((categoryId) => ({ budgetId, categoryId })),
      });
    }

    return tx.budget.update({
      where: { id: budgetId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        limit: limitMinorUnits,
        period,
      },
      include: { categories: true },
    });
  });

  return { ok: true, budget: mapBudgetToRecord(budget, reportingCurrency) };
}

export async function deleteBudget(
  budgetId: string,
  householdId: string
): Promise<DeleteBudgetResult> {
  const prisma = getPrisma();
  try {
    await prisma.budget.delete({ where: { id: budgetId, householdId } });
    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return { ok: false, error: 'not-found' };
    }
    throw error;
  }
}
