import { isCurrencyCode } from '@prometheus/domain';

import type {
  ExtractedCommand,
  NeedsClarificationCommand,
  ResolvedCommand,
  ResolvedTransactionCommand,
  ResolvedTransferCommand,
} from './add-command.js';

export type HouseholdContext = {
  reportingCurrency: string;
  accounts: ReadonlyArray<{ id: string; name: string; currency: string; type: string }>;
  categories: ReadonlyArray<{ id: string; name: string; type: 'income' | 'expense' }>;
};

type MatchResult =
  | { kind: 'matched'; id: string; name: string }
  | { kind: 'missing' }
  | { kind: 'ambiguous'; candidates: string[] }
  | { kind: 'unmatched' };

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function findMatch(
  name: string | undefined,
  items: ReadonlyArray<{ id: string; name: string }>
): MatchResult {
  if (!name) return { kind: 'missing' };

  const target = normalizeName(name);
  const matches = items.filter((item) => normalizeName(item.name) === target);

  if (matches.length === 1) {
    return { kind: 'matched', id: matches[0].id, name: matches[0].name };
  }

  if (matches.length > 1) {
    return { kind: 'ambiguous', candidates: matches.map((m) => m.name) };
  }

  const partial = items.filter(
    (item) => normalizeName(item.name).includes(target) || target.includes(normalizeName(item.name))
  );
  if (partial.length === 1) {
    return { kind: 'matched', id: partial[0].id, name: partial[0].name };
  }
  if (partial.length > 1) {
    return { kind: 'ambiguous', candidates: partial.map((m) => m.name) };
  }

  // Token-overlap fallback: pick the item that shares the most word stems with
  // the target ("movie night" → "Movies") when there is a single clear winner.
  const stem = (token: string) => (token.length > 3 ? token.replace(/s$/, '') : token);
  const targetStems = new Set(target.split(/\s+/).filter(Boolean).map(stem));
  if (targetStems.size > 0) {
    const scored = items
      .map((item) => {
        const stems = normalizeName(item.name).split(/\s+/).filter(Boolean).map(stem);
        const overlap = stems.filter((t) => targetStems.has(t)).length;
        return { item, overlap };
      })
      .filter((s) => s.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap);

    if (scored.length > 0 && (scored.length === 1 || scored[0].overlap > scored[1].overlap)) {
      return { kind: 'matched', id: scored[0].item.id, name: scored[0].item.name };
    }
  }

  return { kind: 'unmatched' };
}

function defaultCurrency(extracted: string | undefined, context: HouseholdContext): string {
  if (extracted && isCurrencyCode(extracted)) return extracted;
  return context.reportingCurrency;
}

function defaultDate(extracted: string | undefined): Date {
  if (!extracted) return new Date();
  const parsed = new Date(extracted);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

function buildClarification(
  understood: string,
  missing: string[],
  options?: { field: string; values: string[] }[]
): NeedsClarificationCommand {
  let question: string;
  if (missing.length === 1) {
    const field = missing[0];
    question = `${understood} Which ${field} did you mean?`;
  } else {
    const fields = missing.join(' and ');
    question = `${understood} I also need your ${fields} to complete this.`;
  }

  return {
    kind: 'needs-clarification',
    understood,
    missing,
    question,
    options,
  };
}

function resolveTransaction(
  extracted: ExtractedCommand,
  context: HouseholdContext
): ResolvedCommand {
  if (extracted.kind === 'unsupported') return extracted;
  if (extracted.kind === 'add-transfer') return resolveTransfer(extracted, context);

  let accountMatch = findMatch(extracted.account, context.accounts);
  const eligibleCategories = context.categories.filter((c) => c.type === extracted.type);
  const categoryMatch = findMatch(extracted.category, eligibleCategories);

  const missing: string[] = [];
  const options: { field: string; values: string[] }[] = [];

  if (accountMatch.kind === 'missing') {
    if (context.accounts.length === 1) {
      // Auto-pick the only account available.
      accountMatch = {
        kind: 'matched',
        id: context.accounts[0].id,
        name: context.accounts[0].name,
      };
    } else {
      missing.push('account');
    }
  } else if (accountMatch.kind === 'ambiguous') {
    missing.push('account');
    options.push({ field: 'account', values: accountMatch.candidates });
  }

  if (categoryMatch.kind !== 'matched') {
    missing.push('category');
    if (categoryMatch.kind === 'ambiguous') {
      options.push({ field: 'category', values: categoryMatch.candidates });
    } else if (eligibleCategories.length > 0) {
      options.push({
        field: 'category',
        values: eligibleCategories.slice(0, 5).map((c) => c.name),
      });
    }
  }

  if (missing.length > 0) {
    const actionWord = extracted.type === 'income' ? 'received' : 'spent';
    const understood = `I understood you ${actionWord} ${extracted.amount} ${defaultCurrency(extracted.currency, context)}.`;
    return buildClarification(understood, missing, options);
  }

  const account = accountMatch as { kind: 'matched'; id: string; name: string };
  const category = categoryMatch as { kind: 'matched'; id: string; name: string };

  const resolved: ResolvedTransactionCommand = {
    kind: 'add-transaction',
    type: extracted.type,
    amount: extracted.amount,
    currency: defaultCurrency(extracted.currency, context),
    accountId: account.id,
    accountName: account.name,
    categoryId: category.id,
    categoryName: category.name,
    description: extracted.description,
    date: defaultDate(extracted.date),
  };

  return resolved;
}

function resolveTransfer(extracted: ExtractedCommand, context: HouseholdContext): ResolvedCommand {
  if (extracted.kind !== 'add-transfer') {
    throw new Error('resolveTransfer called with non-transfer command');
  }

  let fromMatch = findMatch(extracted.fromAccount, context.accounts);
  let toMatch = findMatch(extracted.toAccount, context.accounts);

  const missing: string[] = [];
  const options: { field: string; values: string[] }[] = [];

  if (fromMatch.kind === 'missing') {
    if (context.accounts.length === 1) {
      fromMatch = { kind: 'matched', id: context.accounts[0].id, name: context.accounts[0].name };
    } else {
      missing.push('from account');
    }
  } else if (fromMatch.kind === 'ambiguous') {
    missing.push('from account');
    options.push({ field: 'from account', values: fromMatch.candidates });
  }

  if (toMatch.kind === 'missing') {
    if (context.accounts.length === 1) {
      toMatch = { kind: 'matched', id: context.accounts[0].id, name: context.accounts[0].name };
    } else {
      missing.push('to account');
    }
  } else if (toMatch.kind === 'ambiguous') {
    missing.push('to account');
    options.push({ field: 'to account', values: toMatch.candidates });
  }

  if (missing.length > 0) {
    const understood = `I understood you want to transfer ${extracted.amount} ${defaultCurrency(extracted.currency, context)}.`;
    return buildClarification(understood, missing, options);
  }

  const from = fromMatch as { kind: 'matched'; id: string; name: string };
  const to = toMatch as { kind: 'matched'; id: string; name: string };

  const resolved: ResolvedTransferCommand = {
    kind: 'add-transfer',
    amount: extracted.amount,
    currency: defaultCurrency(extracted.currency, context),
    fromAccountId: from.id,
    fromAccountName: from.name,
    toAccountId: to.id,
    toAccountName: to.name,
    description: extracted.description,
    date: defaultDate(extracted.date),
  };

  return resolved;
}

export function resolveEntry(
  extracted: ExtractedCommand,
  context: HouseholdContext
): ResolvedCommand {
  if (extracted.kind === 'unsupported') return extracted;
  return resolveTransaction(extracted, context);
}
