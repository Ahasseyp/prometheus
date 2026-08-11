import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { AccountType, isCurrencyCode } from '@prometheus/domain';

import {
  createAccount,
  deleteAccount,
  findAccountById,
  listAccountsForHousehold,
  updateAccount,
} from './services/account.js';
import { protectedProcedure, router } from './trpc.js';

const accountTypeSchema = z.nativeEnum(AccountType);

const accountNameSchema = z.string().refine((value) => value.trim().length > 0, {
  message: 'Enter an account name.',
});

const currencySchema = z.string().refine(isCurrencyCode, {
  message: 'Unsupported currency.',
});

const accountResponseSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string(),
  type: accountTypeSchema,
  currency: z.string(),
  balance: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const createAccountInputSchema = z.object({
  name: accountNameSchema,
  type: accountTypeSchema,
  currency: currencySchema,
});

const accountIdInputSchema = z.object({
  id: z.string().uuid(),
});

const updateAccountInputSchema = z.object({
  id: z.string().uuid(),
  name: accountNameSchema.optional(),
  type: accountTypeSchema.optional(),
  currency: currencySchema.optional(),
});

function getHouseholdId(ctx: { user: { household: { id: string } | null } }): string {
  if (ctx.user.household === null) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Create a household before managing accounts.',
    });
  }
  return ctx.user.household.id;
}

function ensureAccountFound<T>(account: T | null): T {
  if (account === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Account not found.' });
  }
  return account;
}

export const accountRouter = router({
  create: protectedProcedure
    .input(createAccountInputSchema)
    .output(accountResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx);
      const account = await createAccount(input, householdId);
      return account;
    }),

  list: protectedProcedure.output(z.array(accountResponseSchema)).query(async ({ ctx }) => {
    const householdId = getHouseholdId(ctx);
    return listAccountsForHousehold(householdId);
  }),

  get: protectedProcedure
    .input(accountIdInputSchema)
    .output(accountResponseSchema)
    .query(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx);
      const account = await findAccountById(input.id, householdId);
      return ensureAccountFound(account);
    }),

  update: protectedProcedure
    .input(updateAccountInputSchema)
    .output(accountResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx);
      const { id, ...updateInput } = input;
      const account = await updateAccount(id, householdId, updateInput);
      return ensureAccountFound(account);
    }),

  delete: protectedProcedure
    .input(accountIdInputSchema)
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx);
      const deleted = await deleteAccount(input.id, householdId);
      if (!deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Account not found.' });
      }
      return { ok: true as const };
    }),
});

export type AccountRouter = typeof accountRouter;
