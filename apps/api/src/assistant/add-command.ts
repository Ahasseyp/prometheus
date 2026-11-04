import { z } from 'zod';

import { isPositiveDecimal } from '@prometheus/domain';

export const transactionTypeSchema = z.enum(['income', 'expense']);

export const amountSchema = z.string().refine(isPositiveDecimal, {
  message: 'Enter a positive amount.',
});

/**
 * Extraction schema: the LLM (or fake extractor) reads free-form text and
 * fills this shape. Clarification is intentionally not part of extraction —
 * the resolver produces that after matching against the household's real
 * categories and accounts.
 */
export const extractedTransactionCommandSchema = z.object({
  kind: z.literal('add-transaction'),
  type: transactionTypeSchema,
  amount: amountSchema,
  currency: z.string().optional(),
  account: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
});

export const extractedTransferCommandSchema = z.object({
  kind: z.literal('add-transfer'),
  amount: amountSchema,
  currency: z.string().optional(),
  fromAccount: z.string().optional(),
  toAccount: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
});

export const extractedUnsupportedSchema = z.object({
  kind: z.literal('unsupported'),
  reason: z.string(),
});

/** Extraction itself failed (provider outage); retry, don't rephrase. */
export const extractedErrorSchema = z.object({
  kind: z.literal('error'),
  message: z.string(),
});

export const extractedCommandSchema = z.discriminatedUnion('kind', [
  extractedTransactionCommandSchema,
  extractedTransferCommandSchema,
  extractedUnsupportedSchema,
  extractedErrorSchema,
]);

export type ExtractedTransactionCommand = z.infer<typeof extractedTransactionCommandSchema>;
export type ExtractedTransferCommand = z.infer<typeof extractedTransferCommandSchema>;
export type ExtractedUnsupported = z.infer<typeof extractedUnsupportedSchema>;
export type ExtractedCommand = z.infer<typeof extractedCommandSchema>;

const resolvedTransactionSchema = z.object({
  kind: z.literal('add-transaction'),
  type: transactionTypeSchema,
  amount: amountSchema,
  currency: z.string(),
  accountId: z.string().uuid().optional(),
  accountName: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  categoryName: z.string().optional(),
  description: z.string().optional(),
  date: z.coerce.date(),
});

const resolvedTransferSchema = z.object({
  kind: z.literal('add-transfer'),
  amount: amountSchema,
  currency: z.string(),
  fromAccountId: z.string().uuid().optional(),
  fromAccountName: z.string().optional(),
  toAccountId: z.string().uuid().optional(),
  toAccountName: z.string().optional(),
  description: z.string().optional(),
  date: z.coerce.date(),
});

const needsClarificationSchema = z.object({
  kind: z.literal('needs-clarification'),
  understood: z.string(),
  missing: z.array(z.string()),
  question: z.string(),
  options: z
    .array(
      z.object({
        field: z.string(),
        values: z.array(z.string()),
      })
    )
    .optional(),
});

export const resolvedCommandSchema = z.discriminatedUnion('kind', [
  resolvedTransactionSchema,
  resolvedTransferSchema,
  needsClarificationSchema,
  extractedUnsupportedSchema,
  extractedErrorSchema,
]);

/** The resolved shapes that are ready to execute (no clarification/unsupported). */
export const executableCommandSchema = z.discriminatedUnion('kind', [
  resolvedTransactionSchema,
  resolvedTransferSchema,
]);

export type ResolvedTransactionCommand = z.infer<typeof resolvedTransactionSchema>;
export type ResolvedTransferCommand = z.infer<typeof resolvedTransferSchema>;
export type NeedsClarificationCommand = z.infer<typeof needsClarificationSchema>;
export type ResolvedCommand = z.infer<typeof resolvedCommandSchema>;
