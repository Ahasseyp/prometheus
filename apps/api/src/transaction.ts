import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { TransactionType } from '@prometheus/domain';

import {
  createTransaction,
  deleteTransaction,
  findTransactionById,
  listTransactionsForHousehold,
  updateTransaction,
} from './services/transaction.js';
import type { TransactionErrorCode } from './services/transaction.js';
import { getHouseholdId, protectedProcedure, router, throwServiceError } from './trpc.js';

const transactionTypeSchema = z.nativeEnum(TransactionType);

// The amount crosses the API as a decimal string in the Account Currency,
// like the account balance; the service validates it against the currency
// exponent via createMoney.
const amountSchema = z.string().refine((value) => value.trim().length > 0, {
  message: 'Enter an amount.',
});

const transactionResponseSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  type: transactionTypeSchema,
  amount: z.string(),
  date: z.date(),
  description: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  accountName: z.string(),
  accountCurrency: z.string(),
  categoryName: z.string(),
});

const createTransactionInputSchema = z.object({
  type: transactionTypeSchema,
  amount: amountSchema,
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  date: z.coerce.date(),
  description: z.string().optional(),
});

const transactionIdInputSchema = z.object({
  id: z.string().uuid(),
});

const updateTransactionInputSchema = z.object({
  id: z.string().uuid(),
  type: transactionTypeSchema.optional(),
  amount: amountSchema.optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  date: z.coerce.date().optional(),
  description: z.string().optional(),
});

const listTransactionsInputSchema = z.object({
  accountId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const transactionErrorMappings: Record<
  TransactionErrorCode,
  { code: 'NOT_FOUND' | 'BAD_REQUEST'; message: string }
> = {
  'account-not-found': { code: 'NOT_FOUND', message: 'Account not found.' },
  'category-not-found': { code: 'NOT_FOUND', message: 'Category not found.' },
  'type-mismatch': {
    code: 'BAD_REQUEST',
    message: 'The category type must match the transaction type.',
  },
  'invalid-amount': {
    code: 'BAD_REQUEST',
    message: 'Enter a positive amount valid for the account’s currency.',
  },
  'amount-incompatible-with-account': {
    code: 'BAD_REQUEST',
    message:
      'The stored amount cannot be represented in the new account’s currency; supply a new amount.',
  },
};

export const transactionRouter = router({
  create: protectedProcedure
    .input(createTransactionInputSchema)
    .output(transactionResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'transactions');
      const result = await createTransaction(input, householdId);
      if (!result.ok) {
        throwServiceError(result.error, transactionErrorMappings);
      }
      return result.transaction;
    }),

  list: protectedProcedure
    .input(listTransactionsInputSchema)
    .output(z.array(transactionResponseSchema))
    .query(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'transactions');
      return listTransactionsForHousehold(householdId, input);
    }),

  get: protectedProcedure
    .input(transactionIdInputSchema)
    .output(transactionResponseSchema)
    .query(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'transactions');
      const transaction = await findTransactionById(input.id, householdId);
      if (transaction === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found.' });
      }
      return transaction;
    }),

  update: protectedProcedure
    .input(updateTransactionInputSchema)
    .output(transactionResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'transactions');
      const { id, ...updateInput } = input;
      const result = await updateTransaction(id, householdId, updateInput);
      if (!result.ok) {
        if (result.error === 'not-found') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found.' });
        }
        throwServiceError(result.error, transactionErrorMappings);
      }
      return result.transaction;
    }),

  delete: protectedProcedure
    .input(transactionIdInputSchema)
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'transactions');
      const deleted = await deleteTransaction(input.id, householdId);
      if (!deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found.' });
      }
      return { ok: true as const };
    }),
});

export type TransactionRouter = typeof transactionRouter;
