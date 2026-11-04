import { describe, expect, it } from 'vitest';

import { resolveEntry, type HouseholdContext } from './resolve-entry.js';

describe('resolveEntry', () => {
  const context: HouseholdContext = {
    reportingCurrency: 'USD',
    accounts: [
      { id: 'acc-1', name: 'Checking', currency: 'USD', type: 'CHECKING' },
      { id: 'acc-2', name: 'Savings', currency: 'USD', type: 'SAVINGS' },
    ],
    categories: [
      { id: 'cat-1', name: 'Groceries', type: 'expense' },
      { id: 'cat-2', name: 'Dining', type: 'expense' },
      { id: 'cat-3', name: 'Salary', type: 'income' },
    ],
  };

  it('resolves a complete expense when category and account are present', () => {
    const extracted = {
      kind: 'add-transaction' as const,
      type: 'expense' as const,
      amount: '300',
      currency: 'MXN',
      account: 'checking',
      category: 'groceries',
      description: 'Groceries',
    };

    const result = resolveEntry(extracted, context);

    expect(result).toEqual({
      kind: 'add-transaction',
      type: 'expense',
      amount: '300',
      currency: 'MXN',
      accountId: 'acc-1',
      accountName: 'Checking',
      categoryId: 'cat-1',
      categoryName: 'Groceries',
      description: 'Groceries',
      date: expect.any(Date),
    });
  });

  it('fuzzy-matches a category when the wording is close but not exact', () => {
    const extracted = {
      kind: 'add-transaction' as const,
      type: 'expense' as const,
      amount: '45',
      account: 'checking',
      category: 'weekly groceries',
    };

    const result = resolveEntry(extracted, context);

    expect(result.kind).toBe('add-transaction');
    if (result.kind !== 'add-transaction') return;
    expect(result.categoryId).toBe('cat-1');
    expect(result.categoryName).toBe('Groceries');
  });

  it('auto-picks the only account when no account is named', () => {
    const singleAccountContext: HouseholdContext = {
      reportingCurrency: 'USD',
      accounts: [{ id: 'acc-solo', name: 'Cash', currency: 'USD', type: 'CASH' }],
      categories: context.categories,
    };

    const extracted = {
      kind: 'add-transaction' as const,
      type: 'expense' as const,
      amount: '50',
      category: 'dining',
      description: 'lunch',
    };

    const result = resolveEntry(extracted, singleAccountContext);

    expect(result).toEqual({
      kind: 'add-transaction',
      type: 'expense',
      amount: '50',
      currency: 'USD',
      accountId: 'acc-solo',
      accountName: 'Cash',
      categoryId: 'cat-2',
      categoryName: 'Dining',
      description: 'lunch',
      date: expect.any(Date),
    });
  });

  it('asks for clarification when the category does not exist', () => {
    const extracted = {
      kind: 'add-transaction' as const,
      type: 'expense' as const,
      amount: '300',
      currency: 'MXN',
      account: 'checking',
      category: 'fuel',
      description: 'spent 300 pesos on fuel',
    };

    const result = resolveEntry(extracted, context);

    expect(result).toEqual({
      kind: 'needs-clarification',
      understood: 'I understood you spent 300 MXN.',
      missing: ['category'],
      question: expect.stringContaining('category'),
      options: [{ field: 'category', values: ['Groceries', 'Dining'] }],
    });
  });

  it('asks for clarification when the account is ambiguous', () => {
    const ambiguousContext: HouseholdContext = {
      reportingCurrency: 'USD',
      accounts: [
        { id: 'acc-a', name: 'Savings Personal', currency: 'USD', type: 'SAVINGS' },
        { id: 'acc-b', name: 'Savings Joint', currency: 'USD', type: 'SAVINGS' },
      ],
      categories: context.categories,
    };

    const extracted = {
      kind: 'add-transaction' as const,
      type: 'income' as const,
      amount: '500',
      account: 'savings',
      category: 'salary',
      description: 'salary deposit',
    };

    const result = resolveEntry(extracted, ambiguousContext);

    expect(result).toEqual({
      kind: 'needs-clarification',
      understood: 'I understood you received 500 USD.',
      missing: ['account'],
      question: expect.stringContaining('account'),
      options: [{ field: 'account', values: ['Savings Personal', 'Savings Joint'] }],
    });
  });

  it('resolves a transfer with matched accounts', () => {
    const extracted = {
      kind: 'add-transfer' as const,
      amount: '100',
      fromAccount: 'checking',
      toAccount: 'savings',
      description: 'move 100 from checking to savings',
    };

    const result = resolveEntry(extracted, context);

    expect(result).toEqual({
      kind: 'add-transfer',
      amount: '100',
      currency: 'USD',
      fromAccountId: 'acc-1',
      fromAccountName: 'Checking',
      toAccountId: 'acc-2',
      toAccountName: 'Savings',
      description: 'move 100 from checking to savings',
      date: expect.any(Date),
    });
  });

  it('passes through an unsupported command unchanged', () => {
    const extracted = {
      kind: 'unsupported' as const,
      reason: 'No amount found.',
    };

    const result = resolveEntry(extracted, context);

    expect(result).toEqual(extracted);
  });
});
