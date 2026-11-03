import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { isCurrencyCode } from '@prometheus/domain';

import {
  createGoal,
  deleteGoal,
  findGoalById,
  listGoalsForHousehold,
  updateGoal,
} from './services/goal.js';
import { getHouseholdId, protectedProcedure, router, throwServiceError } from './trpc.js';

const goalNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Enter a goal name.' })
  .max(100, { message: 'Goal name is too long.' });

// The target crosses the API as a decimal string in the Goal Currency; the
// service validates it against the currency exponent via createMoney.
const goalTargetSchema = z.string().refine((value) => value.trim().length > 0, {
  message: 'Enter a target amount.',
});

const goalCurrencySchema = z.string().refine(isCurrencyCode, {
  message: 'Unsupported currency.',
});

const goalResponseSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string(),
  target: z.string(),
  currency: z.string(),
  deadline: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const createGoalInputSchema = z.object({
  name: goalNameSchema,
  target: goalTargetSchema,
  currency: goalCurrencySchema,
  deadline: z.coerce.date(),
});

const goalIdInputSchema = z.object({
  id: z.string().uuid(),
});

// Goal Currency is fixed after creation (ADR-0002); the update path
// deliberately omits it.
const updateGoalInputSchema = z.object({
  id: z.string().uuid(),
  name: goalNameSchema.optional(),
  target: goalTargetSchema.optional(),
  deadline: z.coerce.date().optional(),
});

const saveGoalErrorMappings = {
  'not-found': { code: 'NOT_FOUND', message: 'Goal not found.' },
  'invalid-data': { code: 'BAD_REQUEST', message: 'The goal data is invalid.' },
} as const;

function ensureGoalFound<T>(goal: T | null): T {
  if (goal === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Goal not found.' });
  }
  return goal;
}

export const goalRouter = router({
  create: protectedProcedure
    .input(createGoalInputSchema)
    .output(goalResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'goals');
      const result = await createGoal(input, householdId);
      if (!result.ok) {
        throwServiceError(result.error, saveGoalErrorMappings);
      }
      return result.goal;
    }),

  list: protectedProcedure.output(z.array(goalResponseSchema)).query(async ({ ctx }) => {
    const householdId = getHouseholdId(ctx, 'goals');
    return listGoalsForHousehold(householdId);
  }),

  get: protectedProcedure
    .input(goalIdInputSchema)
    .output(goalResponseSchema)
    .query(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'goals');
      const goal = await findGoalById(input.id, householdId);
      return ensureGoalFound(goal);
    }),

  update: protectedProcedure
    .input(updateGoalInputSchema)
    .output(goalResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'goals');
      const { id, ...updateInput } = input;
      const result = await updateGoal(id, householdId, updateInput);
      if (!result.ok) {
        throwServiceError(result.error, saveGoalErrorMappings);
      }
      return result.goal;
    }),

  delete: protectedProcedure
    .input(goalIdInputSchema)
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'goals');
      const result = await deleteGoal(input.id, householdId);
      if (!result.ok) {
        throwServiceError(result.error, saveGoalErrorMappings);
      }
      return { ok: true as const };
    }),
});

export type GoalRouter = typeof goalRouter;
