import { z } from 'zod';
import { RecurrencePeriod, TransactionType } from '@prometheus/domain';

import {
  createRecurringTransaction,
  listRecurringTransactionsForHousehold,
} from './services/recurring-transaction.js';
import type { RecurringTransactionValidationError } from './services/recurring-transaction.js';
import { getHouseholdId, protectedProcedure, router, throwServiceError } from './trpc.js';

const transactionTypeSchema = z
  .nativeEnum(TransactionType)
  .refine((value) => value === TransactionType.Income || value === TransactionType.Expense, {
    message: 'Select income or expense.',
  });

const recurrencePeriodSchema = z.nativeEnum(RecurrencePeriod);

const recurrenceIntervalSchema = z.coerce.number().int().min(1, 'Interval must be at least 1.');

const amountSchema = z.string().refine((value) => value.trim().length > 0, {
  message: 'Enter an amount.',
});

const recurringTransactionResponseSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  type: transactionTypeSchema,
  amount: z.string(),
  startDate: z.date(),
  period: recurrencePeriodSchema,
  interval: z.number().int().min(1),
  nextDate: z.date(),
  description: z.string(),
  accountName: z.string(),
  accountCurrency: z.string(),
  categoryName: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const createRecurringTransactionInputSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  type: transactionTypeSchema,
  amount: amountSchema,
  startDate: z.coerce.date(),
  period: recurrencePeriodSchema,
  interval: recurrenceIntervalSchema,
  description: z.string().optional(),
});

const recurringTransactionErrorMappings: Record<
  RecurringTransactionValidationError,
  { code: 'NOT_FOUND' | 'BAD_REQUEST'; message: string }
> = {
  'invalid-data': { code: 'BAD_REQUEST', message: 'The recurring transaction data is invalid.' },
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
  'invalid-period': { code: 'BAD_REQUEST', message: 'Select a valid recurrence period.' },
  'invalid-interval': {
    code: 'BAD_REQUEST',
    message: 'Interval must be a whole number of at least 1.',
  },
};

export const recurringTransactionRouter = router({
  create: protectedProcedure
    .input(createRecurringTransactionInputSchema)
    .output(recurringTransactionResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'recurring transactions');
      const result = await createRecurringTransaction(input, householdId);
      if (!result.ok) {
        throwServiceError(result.error, recurringTransactionErrorMappings);
      }
      return result.recurringTransaction;
    }),

  list: protectedProcedure
    .output(z.array(recurringTransactionResponseSchema))
    .query(async ({ ctx }) => {
      const householdId = getHouseholdId(ctx, 'recurring transactions');
      return listRecurringTransactionsForHousehold(householdId);
    }),
});

export type RecurringTransactionRouter = typeof recurringTransactionRouter;
