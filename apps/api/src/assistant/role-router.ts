import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
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

const DEFAULT_EXTRACTION_MODEL = 'claude-haiku-4-5-20251001';

const EXTRACTION_SYSTEM = `You extract financial transactions from a user's free-form message.

Return ONLY a single JSON object. Do not wrap it in markdown code fences. Use this exact shape:

{
  "kind": "add-transaction" | "add-transfer" | "unsupported",
  // For add-transaction:
  "type": "income" | "expense",
  "amount": "300",
  "currency": "MXN",              // optional ISO 4217 code; omit if unknown
  "account": "string",            // optional, keep the user's wording
  "category": "string",           // optional, keep the user's wording
  "description": "string",      // optional, default to the original message
  "date": "YYYY-MM-DD",           // optional
  // For add-transfer (omit "type"):
  "fromAccount": "string",        // optional
  "toAccount": "string",          // optional
  // For unsupported:
  "reason": "string"
}

Conventions:
- Amount must be a positive decimal string (e.g. "300" or "49.99").
- For transfers, omit "type".
- For unsupported, include only "kind" and "reason".

If the message is not about adding a transaction/transfer or you cannot extract an amount, return { "kind": "unsupported", "reason": "..." }.`;

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
    const result = await generateText({
      model,
      system: EXTRACTION_SYSTEM,
      prompt: text,
    });
    const json = extractJsonObject(result.text);
    return schema.parse(json);
  };
}

/**
 * Pull a JSON object out of a model response, tolerating markdown fences and
 * surrounding whitespace.
 */
function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch?.[1].trim() ?? trimmed;
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (!objectMatch) {
    throw new Error('No JSON object found in model response.');
  }
  return JSON.parse(objectMatch[0]);
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
