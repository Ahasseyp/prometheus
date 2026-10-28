import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { isPositiveDecimal } from '@prometheus/domain';

import { createTransfer, findTransferById } from './services/transfer.js';
import type { TransferErrorCode } from './services/transfer.js';
import { transactionResponseSchema } from './transaction.js';
import { getHouseholdId, protectedProcedure, router, throwServiceError } from './trpc.js';

const transferAmountSchema = z.string().refine((value) => value.trim().length > 0, {
  message: 'Enter an amount.',
});

const transferResponseSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  exchangeRate: z.string().nullable(),
  sourceTransaction: transactionResponseSchema,
  destinationTransaction: transactionResponseSchema,
});

const createTransferInputSchema = z.object({
  sourceAccountId: z.string().uuid(),
  destinationAccountId: z.string().uuid(),
  amount: transferAmountSchema,
  destinationAmount: transferAmountSchema.optional(),
  exchangeRate: z
    .string()
    .refine(isPositiveDecimal, { message: 'Enter a positive Exchange Rate.' })
    .optional(),
  date: z.coerce.date(),
  description: z.string().optional(),
});

const transferIdInputSchema = z.object({
  id: z.string().uuid(),
});

const transferErrorMappings: Record<
  TransferErrorCode,
  { code: 'NOT_FOUND' | 'BAD_REQUEST'; message: string }
> = {
  'account-not-found': { code: 'NOT_FOUND', message: 'Account not found.' },
  'same-account': {
    code: 'BAD_REQUEST',
    message: 'The source and destination Accounts must be different.',
  },
  'invalid-amount': {
    code: 'BAD_REQUEST',
    message: 'Enter a positive amount valid for the source Account’s currency.',
  },
  'invalid-destination-amount': {
    code: 'BAD_REQUEST',
    message: 'Enter a positive destination amount valid for its currency.',
  },
  'missing-destination-amount': {
    code: 'BAD_REQUEST',
    message: 'Enter a destination amount for this cross-currency Transfer.',
  },
  'invalid-exchange-rate': {
    code: 'BAD_REQUEST',
    message: 'Enter a positive Exchange Rate.',
  },
  'missing-exchange-rate': {
    code: 'BAD_REQUEST',
    message: 'Enter an Exchange Rate for this cross-currency Transfer.',
  },
  'rate-amount-mismatch': {
    code: 'BAD_REQUEST',
    message: 'The Exchange Rate does not match the source and destination amounts.',
  },
  'loan-overpayment': {
    code: 'BAD_REQUEST',
    message: 'This Transfer would overpay the loan.',
  },
  'exchange-rate-unavailable': {
    code: 'BAD_REQUEST',
    message: 'An Exchange Rate is unavailable for this Account Currency and transaction date.',
  },
  'invalid-data': { code: 'BAD_REQUEST', message: 'The transfer data is invalid.' },
};

export const transferRouter = router({
  create: protectedProcedure
    .input(createTransferInputSchema)
    .output(transferResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'transfers');
      const result = await createTransfer(input, householdId);
      if (!result.ok) {
        throwServiceError(result.error, transferErrorMappings);
      }
      return result.transfer;
    }),

  get: protectedProcedure
    .input(transferIdInputSchema)
    .output(transferResponseSchema)
    .query(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'transfers');
      const transfer = await findTransferById(input.id, householdId);
      if (transfer === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found.' });
      }
      return transfer;
    }),
});

export type TransferRouter = typeof transferRouter;
