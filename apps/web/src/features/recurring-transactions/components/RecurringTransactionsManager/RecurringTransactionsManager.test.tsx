import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAccount, mockAccountListResponse } from '@/test/account-helpers.js';
import { makeCategory, mockCategoryListResponse } from '@/test/category-helpers.js';
import { mockMatchMedia } from '@/test/match-media.js';
import { createQueryClientWrapper } from '@/test/providers.js';
import {
  makeRecurringTransaction,
  mockCreateRecurringTransactionResponse,
  mockDeleteRecurringTransactionResponse,
  mockRecurringTransactionListResponse,
  mockSkipRecurringTransactionInstanceResponse,
  mockUpdateRecurringTransactionResponse,
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
    if (typeof window.PointerEvent === 'undefined') {
      vi.stubGlobal(
        'PointerEvent',
        class PointerEvent extends MouseEvent {
          // Base UI dispatches a synthetic PointerEvent to the hidden checkbox
          // when clicking the switch root; jsdom does not provide it.
        }
      );
    }
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
    await user.click(screen.getByRole('button', { name: 'Weeks' }));

    list.push(createdRecurringTransaction);
    await user.click(screen.getByRole('button', { name: 'Add schedule' }));

    await waitFor(() => expect(screen.getByText('Weekly groceries')).toBeInTheDocument());
    expect(screen.getByText('Every week')).toBeInTheDocument();
  });

  it('skips the next Transaction Instance of a schedule', async () => {
    const user = userEvent.setup();
    const recurringTransaction = makeRecurringTransaction({ description: 'Rent' });
    const updatedRecurringTransaction = makeRecurringTransaction({
      ...recurringTransaction,
      nextDate: '2026-12-01T00:00:00.000Z',
    });

    mockRecurringTransactionListResponse([recurringTransaction]);
    mockSkipRecurringTransactionInstanceResponse({
      id: recurringTransaction.id,
      skippedDate: recurringTransaction.nextDate,
    });
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Actions for Rent' }));
    await user.click(
      await screen.findByRole('menuitem', { name: 'Skip next Transaction Instance' })
    );

    // Simulate the backend invalidating the list query by returning the
    // updated schedule on the next fetch.
    mockRecurringTransactionListResponse([updatedRecurringTransaction]);
    await user.click(screen.getByRole('button', { name: 'Skip instance' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        screen.getByText(formatRecurringTransactionDate(updatedRecurringTransaction.nextDate))
      ).toBeInTheDocument();
    });
  });

  it('edits a schedule from the row actions', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(window, 'fetch');
    const recurringTransaction = makeRecurringTransaction({ description: 'Rent' });
    const updatedRecurringTransaction = makeRecurringTransaction({
      ...recurringTransaction,
      amount: '55.00',
      interval: 2,
    });

    mockRecurringTransactionListResponse([recurringTransaction]);
    mockUpdateRecurringTransactionResponse(updatedRecurringTransaction);
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Actions for Rent' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit recurring transaction' });

    await user.clear(within(dialog).getByLabelText('Amount'));
    await user.type(within(dialog).getByLabelText('Amount'), '55.00');
    await user.clear(within(dialog).getByLabelText('Repeat every'));
    await user.type(within(dialog).getByLabelText('Repeat every'), '2');

    mockRecurringTransactionListResponse([updatedRecurringTransaction]);
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await vi.waitFor(() => {
      const updateCall = fetchSpy.mock.calls.find(
        ([url, init]) =>
          String(url).includes('recurringTransaction.update') && init?.method === 'POST'
      );
      expect(updateCall).toBeDefined();
      expect(JSON.parse(String(updateCall![1]?.body))).toEqual(
        expect.objectContaining({
          id: recurringTransaction.id,
          amount: '55.00',
          interval: '2',
        })
      );
    });
    fetchSpy.mockRestore();
  });

  it('deletes a schedule after confirmation', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(window, 'fetch');
    const recurringTransaction = makeRecurringTransaction({ description: 'Rent' });

    mockRecurringTransactionListResponse([recurringTransaction]);
    mockDeleteRecurringTransactionResponse();
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Actions for Rent' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Rent?' });

    await user.click(
      screen.getByRole('switch', { name: 'Also remove already generated transactions' })
    );
    await user.click(within(dialog).getByRole('button', { name: 'Delete schedule' }));

    await vi.waitFor(() => {
      const deleteCall = fetchSpy.mock.calls.find(
        ([url, init]) =>
          String(url).includes('recurringTransaction.delete') && init?.method === 'POST'
      );
      expect(deleteCall).toBeDefined();
      expect(JSON.parse(String(deleteCall![1]?.body))).toEqual({
        id: recurringTransaction.id,
        removeGenerated: true,
      });
    });
    fetchSpy.mockRestore();
  });
});
