import { z } from 'zod';
import { HouseholdMembershipRole, isCurrencyCode } from '@prometheus/domain';

import {
  createHousehold,
  findActiveHouseholdForUser,
  USER_ALREADY_HAS_HOUSEHOLD_ERROR,
} from './services/household.js';
import { protectedProcedure, router } from './trpc.js';

const createHouseholdInputSchema = z.object({
  name: z.string().refine((value) => value.trim().length > 0, {
    message: 'Enter a household name.',
  }),
  reportingCurrency: z.string().refine(isCurrencyCode, {
    message: 'Unsupported currency.',
  }),
});

const householdResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  reportingCurrency: z.string(),
});

const createHouseholdOutputSchema = z.union([
  z.object({
    ok: z.literal(true),
    household: householdResponseSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.enum([USER_ALREADY_HAS_HOUSEHOLD_ERROR]),
  }),
]);

const householdContextSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  reportingCurrency: z.string(),
  role: z.nativeEnum(HouseholdMembershipRole),
});

const meOutputSchema = z.object({
  household: householdContextSchema.nullable(),
});

export const householdRouter = router({
  create: protectedProcedure
    .input(createHouseholdInputSchema)
    .output(createHouseholdOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createHousehold(input, ctx.user.id);
      return result;
    }),

  me: protectedProcedure.output(meOutputSchema).query(async ({ ctx }) => {
    const household = await findActiveHouseholdForUser(ctx.user.id);
    return { household };
  }),
});

export type HouseholdRouter = typeof householdRouter;
