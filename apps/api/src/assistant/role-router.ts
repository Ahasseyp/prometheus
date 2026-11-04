import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import type { z } from 'zod';

import type { ExtractedCommand } from './add-command.js';

export type AssistantRole = 'entry-extraction';

/**
 * Entry-extraction seam. Returns an extractor that takes free-form text and a
 * Zod schema and returns a plain object that should validate against the
 * schema.
 *
 * When ANTHROPIC_API_KEY is present the call goes through the Vercel AI SDK to
 * Anthropic. When it is missing, a deterministic fake extractor is used so the
 * feature is verifiable without API keys in local dev and tests.
 */
export type EntryExtractor = (input: { text: string; schema: z.ZodSchema }) => Promise<unknown>;

const DEFAULT_EXTRACTION_MODEL = 'claude-haiku-4-5';

const EXTRACTION_SYSTEM = `You extract financial transactions from a user's free-form message.

Return a JSON object matching the requested schema. Use these conventions:
- Transaction type: "income" or "expense" (lowercase).
- Transfer type: "add-transfer".
- Amount: a positive decimal string, e.g. "300" or "49.99".
- Currency: ISO 4217 three-letter code when you can infer one (USD, MXN, EUR, etc.). Omit if unknown.
- Account / category names: keep the user's wording, the backend will match them.
- Date: ISO 8601 YYYY-MM-DD if mentioned; omit if not.
- Description: a short human-readable summary; default to the original message.

If the message is not about adding a transaction/transfer or you cannot extract an amount, return kind "unsupported" with a helpful reason.`;

export function getModel(role: AssistantRole): EntryExtractor {
  if (role !== 'entry-extraction') {
    throw new Error(`Unsupported assistant role: ${role}`);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      '[assistant] ANTHROPIC_API_KEY is not set; using the fake entry extractor (deterministic regex/heuristic). Set ANTHROPIC_API_KEY to use Anthropic.'
    );
    return async (input) => fakeExtract(input);
  }

  const modelName = process.env.ANTHROPIC_EXTRACTION_MODEL ?? DEFAULT_EXTRACTION_MODEL;
  const provider = createAnthropic({ apiKey });
  const model = provider(modelName);

  return async ({ text, schema }) => {
    const result = await generateObject({
      model,
      schema,
      system: EXTRACTION_SYSTEM,
      prompt: text,
    });
    return result.object;
  };
}

/**
 * Deterministic fake extractor used when no LLM key is configured. It is good
 * enough for the verification examples and keeps tests/dev key-free.
 */
function fakeExtract(input: { text: string }): ExtractedCommand {
  const text = input.text.trim();
  const lower = text.toLowerCase();

  const amountMatch = lower.match(/\b(\d+(?:\.\d{1,2})?)\b/);
  const amount = amountMatch?.[1];

  if (!amount) {
    return {
      kind: 'unsupported',
      reason:
        'I could not find an amount in your message. Try something like "spent 300 pesos on groceries".',
    };
  }

  let currency: string | undefined;
  if (lower.includes('peso') || lower.includes('mxn')) currency = 'MXN';
  else if (lower.includes('euro') || lower.includes('eur')) currency = 'EUR';
  else if (lower.includes('dollar') || lower.includes('usd') || text.includes('$'))
    currency = 'USD';

  const description = text;

  if (lower.includes('transfer') || lower.includes('move') || lower.includes('send')) {
    const fromMatch = lower.match(/from\s+(\S+)/);
    const toMatch = lower.match(/(?:to|into)\s+(\S+)/);
    return {
      kind: 'add-transfer',
      amount,
      currency,
      fromAccount: fromMatch?.[1],
      toAccount: toMatch?.[1],
      description,
    };
  }

  const isIncome =
    lower.includes('received') ||
    lower.includes('income') ||
    lower.includes('got paid') ||
    lower.includes('salary') ||
    lower.includes('deposit') ||
    lower.includes('earned');

  const categoryMatch = lower.match(/(?:on|for|from)\s+(\S+)$/);
  const category = categoryMatch?.[1];

  return {
    kind: 'add-transaction',
    type: isIncome ? 'income' : 'expense',
    amount,
    currency,
    category,
    description,
  };
}
