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
export type ConversationMessage = { role: 'user' | 'assistant'; text: string };

/** Household context the extractor can lean on to pick sensible names. */
export type ExtractionHints = {
  accounts: string[];
  expenseCategories: string[];
  incomeCategories: string[];
};

export type EntryExtractor = (input: {
  text: string;
  schema: z.ZodSchema;
  history?: ConversationMessage[];
  hints?: ExtractionHints;
}) => Promise<unknown>;

const DEFAULT_EXTRACTION_MODEL = 'claude-haiku-4-5-20251001';

const EXTRACTION_SYSTEM = `You extract financial transactions from a user's free-form message.

Return ONLY a single JSON object. Do not wrap it in markdown code fences. Use this exact shape:

{
  "kind": "add-transaction" | "add-transfer" | "unsupported",
  // For add-transaction:
  "type": "income" | "expense",
  "amount": "300",
  "currency": "MXN",              // optional ISO 4217 code; omit if unknown
  "account": "string",            // optional
  "category": "string",           // optional
  "description": "string",        // optional
  "date": "YYYY-MM-DD",           // optional, ONLY when the user explicitly states one (e.g. "yesterday", "last Friday", "on Nov 5"). NEVER guess, infer, or invent a date — if no date is stated, omit this field entirely.
  // For add-transfer (omit "type"):
  "fromAccount": "string",        // optional
  "toAccount": "string",          // optional
  // For unsupported:
  "reason": "string"
}

Conventions:
- Amount must be a positive decimal string (e.g. "300" or "49.99").
- "category" is a short noun for what it was for (e.g. "groceries", "movies").
- "description" is a short cleaned-up Title Case label for the entry (e.g. "Movies", "Groceries run") — never copy the raw message verbatim.
- If the prompt includes candidate category or account lists and one candidate clearly fits semantically, use that candidate's exact name (e.g. "movies" → "Entertainment"). Only keep the user's own wording when no candidate fits.
- Never output "date" unless the user explicitly states one in the conversation. Use the provided today's date only to resolve relative dates ("yesterday", "last Friday"); do not output a date otherwise.
- If the prompt includes a conversation history, treat the whole conversation as ONE command: earlier messages carry the original intent, later messages answer the assistant's questions. Merge everything into a single extraction.
- For transfers, omit "type".
- For unsupported, include only "kind" and "reason".

If the message is not about adding a transaction/transfer or you cannot extract an amount even considering the history, return { "kind": "unsupported", "reason": "..." }.`;

function buildPrompt(text: string, history?: ConversationMessage[], hints?: ExtractionHints) {
  const parts: string[] = [];

  if (hints) {
    const lines: string[] = [];
    if (hints.accounts.length > 0) lines.push(`Accounts: ${hints.accounts.join(', ')}`);
    if (hints.expenseCategories.length > 0)
      lines.push(`Expense categories: ${hints.expenseCategories.join(', ')}`);
    if (hints.incomeCategories.length > 0)
      lines.push(`Income categories: ${hints.incomeCategories.join(', ')}`);
    if (lines.length > 0) {
      parts.push(`Candidate accounts and categories in this household:\n${lines.join('\n')}`);
    }
  }

  if (history && history.length > 0) {
    const transcript = history
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');
    parts.push(`Conversation so far:\n${transcript}`);
  }

  // Give the model today's date so relative dates ("yesterday", "last Friday")
  // resolve correctly. It is still told to omit "date" when none is stated.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  parts.push(`Today's date is ${today}.`);

  parts.push(`Latest user message:\n${text}`);
  return parts.join('\n\n');
}

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

  return async ({ text, schema, history, hints }) => {
    const result = await generateText({
      model,
      system: EXTRACTION_SYSTEM,
      prompt: buildPrompt(text, history, hints),
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

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Deterministic fake extractor used when no LLM key is configured. It is good
 * enough for the verification examples and keeps tests/dev key-free. It also
 * merges conversation history so clarification replies complete the original
 * command: earlier user texts carry the intent, a bare reply fills whichever
 * field the last assistant question asked for.
 */
function fakeExtract(input: { text: string; history?: ConversationMessage[] }): ExtractedCommand {
  const history = input.history ?? [];
  const userTexts = history.filter((m) => m.role === 'user').map((m) => m.text);
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant')?.text ?? '';
  const latest = input.text.trim();

  const combined = [...userTexts, latest].join(' ').trim();
  const lower = combined.toLowerCase();

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
  else if (lower.includes('dollar') || lower.includes('usd') || combined.includes('$'))
    currency = 'USD';

  // A short follow-up reply ("cash", "groceries") fills the field the last
  // clarification question asked about.
  const isShortReply = !/\d/.test(latest) && latest.split(/\s+/).length <= 4;
  const fillAccount = isShortReply && /which account/i.test(lastAssistant) ? latest : undefined;
  const fillCategory = isShortReply && /which category/i.test(lastAssistant) ? latest : undefined;

  if (lower.includes('transfer') || lower.includes('move') || lower.includes('send')) {
    const fromMatch = lower.match(/from\s+(\S+)/);
    const toMatch = lower.match(/(?:to|into)\s+(\S+)/);
    const description =
      fromMatch && toMatch
        ? `${toTitleCase(fromMatch[1])} to ${toTitleCase(toMatch[1])}`
        : undefined;
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

  const originalIntent = (userTexts[0] ?? latest).toLowerCase();
  const categoryMatch =
    originalIntent.match(/(?:on|for|from)\s+([a-z][a-z- ]*?)\s*$/) ??
    (!fillCategory ? lower.match(/(?:on|for|from)\s+([a-z][a-z- ]*?)\s*$/) : null);
  const category = fillCategory ?? categoryMatch?.[1];
  const account = fillAccount;

  return {
    kind: 'add-transaction',
    type: isIncome ? 'income' : 'expense',
    amount,
    currency,
    account,
    category,
    description: category ? toTitleCase(category) : undefined,
  };
}
