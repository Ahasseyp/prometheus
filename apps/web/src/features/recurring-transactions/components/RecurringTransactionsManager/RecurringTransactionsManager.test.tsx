import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { makeAccount, mockAccountListResponse } from '@/test/account-helpers.js';
import { makeCategory, mockCategoryListResponse } from '@/test/category-helpers.js';
import { mockMatchMedia } from '@/test/match-media.js';
import { createQueryClientWrapper } from '@/test/providers.js';
import {
  makeRecurringTransaction,
  mockCreateRecurringTransactionResponse,
  mockRecurringTransactionListResponse,
  mockSkipRecurringTransactionResponse,
} from '@/test/recurring-transaction-helpers.js';

import { formatRecurringTransactionDate } from '@/features/recurring-transactions/lib/recurring-transaction-presentation.js';

import { RecurringTransactionsManager } from './RecurringTransactionsManager.js';

const checkingAccount = makeAccount({
  id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  name: 'Everyday Checking',
});

const groceries = makeCategory({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Groceries' });

function renderManager() {
  return render(<RecurringTransactionsManager />, { wrapper: createQueryClientWrapper() });
}

describe('RecurringTransactionsManager', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    mockAccountListResponse([checkingAccount]);
    mockCategoryListResponse([groceries]);
  });

  it('renders recurring transactions from the list endpoint', async () => {
    mockRecurringTransactionListResponse([
      makeRecurringTransaction({ description: 'Rent' }),
      makeRecurringTransaction({
        id: 'a7b8c9d0-e1f2-3456-abcd-567890123456',
        type: 'income',
        amount: '1000.00',
        description: 'Salary',
        categoryName: 'Salary',
      }),
    ]);
    renderManager();

    expect(await screen.findByText('Rent')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
  });

  it('renders an empty state when the household has no recurring transactions', async () => {
    mockRecurringTransactionListResponse([]);
    renderManager();

    expect(await screen.findByText('No recurring transactions yet')).toBeInTheDocument();
  });

  it('creates a new schedule and shows it in the list', async () => {
    const user = userEvent.setup();
    const createdRecurringTransaction = makeRecurringTransaction({
      id: 'created-r1',
      description: 'Weekly groceries',
      period: 'week',
      interval: 1,
      amount: '75.00',
    });

    const list: ReturnType<typeof makeRecurringTransaction>[] = [];
    mockRecurringTransactionListResponse(list);
    mockCreateRecurringTransactionResponse(createdRecurringTransaction);
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Add recurring' }));

    await user.type(screen.getByLabelText('Amount'), '75.00');
    await user.click(screen.getByRole('combobox', { name: 'Account' }));
    await user.click(await screen.findByRole('option', { name: 'Everyday Checking' }));
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'Groceries' }));

    // Switch to weekly period.
    await user.click(screen.getByRole('button', { name: 'weeks' }));

    list.push(createdRecurringTransaction);
    await user.click(screen.getByRole('button', { name: 'Add schedule' }));

    await waitFor(() => expect(screen.getByText('Weekly groceries')).toBeInTheDocument());
    expect(screen.getByText('Every week')).toBeInTheDocument();
  });

  it('skips the next occurrence of a schedule', async () => {
    const user = userEvent.setup();
    const recurringTransaction = makeRecurringTransaction({ description: 'Rent' });
    const updatedRecurringTransaction = makeRecurringTransaction({
      ...recurringTransaction,
      nextDate: '2026-12-01T00:00:00.000Z',
    });

    mockRecurringTransactionListResponse([recurringTransaction]);
    mockSkipRecurringTransactionResponse({
      id: recurringTransaction.id,
      skippedDate: recurringTransaction.nextDate,
    });
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Actions for Rent' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Skip next occurrence' }));

    // Simulate the backend invalidating the list query by returning the
    // updated schedule on the next fetch.
    mockRecurringTransactionListResponse([updatedRecurringTransaction]);
    await user.click(screen.getByRole('button', { name: 'Skip occurrence' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        screen.getByText(formatRecurringTransactionDate(updatedRecurringTransaction.nextDate))
      ).toBeInTheDocument();
    });
  });
});
