import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import {
  createGoalContribution,
  deleteGoalContribution,
  findGoalContributionById,
  listGoalContributions,
  updateGoalContribution,
} from './services/goal-contribution.js';
import { getHouseholdId, protectedProcedure, router, throwServiceError } from './trpc.js';

// The amount crosses the API as a decimal string in the Goal Currency; the
// service validates it against the currency exponent via createMoney.
const contributionAmountSchema = z.string().refine((value) => value.trim().length > 0, {
  message: 'Enter an amount.',
});

const goalContributionResponseSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  goalId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const createGoalContributionInputSchema = z.object({
  goalId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: contributionAmountSchema,
});

const goalContributionIdInputSchema = z.object({
  id: z.string().uuid(),
});

const updateGoalContributionInputSchema = z.object({
  id: z.string().uuid(),
  amount: contributionAmountSchema.optional(),
  accountId: z.string().uuid().optional(),
});

const listGoalContributionsInputSchema = z.object({
  goalId: z.string().uuid(),
});

const saveGoalContributionErrorMappings = {
  'not-found': { code: 'NOT_FOUND', message: 'Goal contribution not found.' },
  'goal-not-found': { code: 'NOT_FOUND', message: 'Goal not found.' },
  'account-not-found': {
    code: 'NOT_FOUND',
    message: 'Account not found in this household.',
  },
  'account-type-not-allowed': {
    code: 'BAD_REQUEST',
    message:
      'Contributions can only be funded from checking, savings, cash, or investment accounts.',
  },
  'currency-mismatch': {
    code: 'BAD_REQUEST',
    message: 'The account currency must match the goal currency.',
  },
  'invalid-data': { code: 'BAD_REQUEST', message: 'The contribution data is invalid.' },
  'insufficient-unallocated': {
    code: 'BAD_REQUEST',
    message: 'The account does not have enough unallocated balance.',
  },
} as const;

function ensureContributionFound<T>(contribution: T | null): T {
  if (contribution === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Goal contribution not found.' });
  }
  return contribution;
}

export const goalContributionRouter = router({
  create: protectedProcedure
    .input(createGoalContributionInputSchema)
    .output(goalContributionResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'goals');
      const result = await createGoalContribution(input, householdId);
      if (!result.ok) {
        throwServiceError(result.error, saveGoalContributionErrorMappings);
      }
      return result.contribution;
    }),

  list: protectedProcedure
    .input(listGoalContributionsInputSchema)
    .output(z.array(goalContributionResponseSchema))
    .query(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'goals');
      const result = await listGoalContributions(input.goalId, householdId);
      if (result === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Goal not found.' });
      }
      return result;
    }),

  get: protectedProcedure
    .input(goalContributionIdInputSchema)
    .output(goalContributionResponseSchema)
    .query(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'goals');
      const contribution = await findGoalContributionById(input.id, householdId);
      return ensureContributionFound(contribution);
    }),

  update: protectedProcedure
    .input(updateGoalContributionInputSchema)
    .output(goalContributionResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'goals');
      const { id, ...updateInput } = input;
      const result = await updateGoalContribution(id, householdId, updateInput);
      if (!result.ok) {
        throwServiceError(result.error, saveGoalContributionErrorMappings);
      }
      return result.contribution;
    }),

  delete: protectedProcedure
    .input(goalContributionIdInputSchema)
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'goals');
      const result = await deleteGoalContribution(input.id, householdId);
      if (!result.ok) {
        throwServiceError(result.error, saveGoalContributionErrorMappings);
      }
      return { ok: true as const };
    }),
});

export type GoalContributionRouter = typeof goalContributionRouter;
