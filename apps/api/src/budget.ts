import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { BudgetPeriod } from '@prometheus/domain';

import {
  createBudget,
  deleteBudget,
  findBudgetById,
  listBudgetsForHousehold,
  updateBudget,
} from './services/budget.js';
import { getHouseholdId, protectedProcedure, router, throwServiceError } from './trpc.js';

const budgetPeriodSchema = z.nativeEnum(BudgetPeriod);

const budgetNameSchema = z.string().max(100).optional();

// The limit crosses the API as a decimal string in the Household Reporting
// Currency; the service validates it against the currency exponent via
// createMoney.
const budgetLimitSchema = z.string().refine((value) => value.trim().length > 0, {
  message: 'Enter an amount.',
});

const budgetCategoryIdsSchema = z.array(z.string().uuid()).min(1, {
  message: 'Choose at least one category.',
});

const budgetResponseSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string(),
  limit: z.string(),
  period: budgetPeriodSchema,
  categoryIds: z.array(z.string().uuid()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const createBudgetInputSchema = z.object({
  name: budgetNameSchema,
  limit: budgetLimitSchema,
  period: budgetPeriodSchema,
  categoryIds: budgetCategoryIdsSchema,
});

const budgetIdInputSchema = z.object({
  id: z.string().uuid(),
});

const updateBudgetInputSchema = z.object({
  id: z.string().uuid(),
  name: budgetNameSchema,
  limit: budgetLimitSchema.optional(),
  period: budgetPeriodSchema.optional(),
  categoryIds: budgetCategoryIdsSchema.optional(),
});

function ensureBudgetFound<T>(budget: T | null): T {
  if (budget === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget not found.' });
  }
  return budget;
}

const saveBudgetErrorMappings = {
  'not-found': { code: 'NOT_FOUND', message: 'Budget not found.' },
  'invalid-data': { code: 'BAD_REQUEST', message: 'The budget data is invalid.' },
  'category-not-found': {
    code: 'NOT_FOUND',
    message: 'One of the categories was not found in this household.',
  },
  'category-not-expense': {
    code: 'BAD_REQUEST',
    message: 'Budgets can only track expense categories.',
  },
} as const;

export const budgetRouter = router({
  create: protectedProcedure
    .input(createBudgetInputSchema)
    .output(budgetResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'budgets');
      const result = await createBudget(input, householdId);
      if (!result.ok) {
        throwServiceError(result.error, saveBudgetErrorMappings);
      }
      return result.budget;
    }),

  list: protectedProcedure.output(z.array(budgetResponseSchema)).query(async ({ ctx }) => {
    const householdId = getHouseholdId(ctx, 'budgets');
    return listBudgetsForHousehold(householdId);
  }),

  get: protectedProcedure
    .input(budgetIdInputSchema)
    .output(budgetResponseSchema)
    .query(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'budgets');
      const budget = await findBudgetById(input.id, householdId);
      return ensureBudgetFound(budget);
    }),

  update: protectedProcedure
    .input(updateBudgetInputSchema)
    .output(budgetResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'budgets');
      const result = await updateBudget(input.id, householdId, {
        name: input.name,
        limit: input.limit,
        period: input.period,
        categoryIds: input.categoryIds,
      });
      if (!result.ok) {
        throwServiceError(result.error, saveBudgetErrorMappings);
      }
      return result.budget;
    }),

  delete: protectedProcedure
    .input(budgetIdInputSchema)
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'budgets');
      const result = await deleteBudget(input.id, householdId);
      if (!result.ok) {
        throwServiceError(result.error, saveBudgetErrorMappings);
      }
      return { ok: true as const };
    }),
});

export type BudgetRouter = typeof budgetRouter;
