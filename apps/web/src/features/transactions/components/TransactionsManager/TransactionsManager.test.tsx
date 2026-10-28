import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAccount, mockAccountListResponse } from '@/test/account-helpers.js';
import { makeTransaction, mockTransactionListResponse } from '@/test/transaction-helpers.js';
import {
  makeTransfer,
  mockDeleteTransferResponse,
  mockGetTransferResponse,
} from '@/test/transfer-helpers.js';
import { mockCategoryListResponse } from '@/test/category-helpers.js';
import { createQueryClientWrapper } from '@/test/providers.js';

import { TransactionsManager } from './TransactionsManager.js';

function createMatchMedia(matches: boolean) {
  return (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

const checkingAccount = makeAccount({
  id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  name: 'Everyday Checking',
});

const savingsAccount = makeAccount({
  id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
  name: 'Vacation Savings',
});

const groceries = makeTransaction({
  id: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
  accountId: checkingAccount.id,
  description: 'Weekly shop',
});

const deposit = makeTransaction({
  id: 'a7b8c9d0-e1f2-3456-abcd-567890123456',
  accountId: savingsAccount.id,
  type: 'income',
  amount: '500.00',
  description: 'Paycheck',
});

const transferId = 'd4e5f6a7-b8c9-0123-defa-234567890123';

const linkedTransaction = makeTransaction({
  id: 'b8c9d0e1-f2a3-4567-bcde-678901234567',
  accountId: checkingAccount.id,
  description: 'Transfer to Savings',
  categoryId: null,
  categoryName: null,
  transfer: {
    id: transferId,
    counterpartyAccountId: savingsAccount.id,
    counterpartyAccountName: 'Vacation Savings',
  },
});

function renderManager() {
  return render(<TransactionsManager />, { wrapper: createQueryClientWrapper() });
}

describe('TransactionsManager', () => {
  beforeEach(() => {
    window.matchMedia = createMatchMedia(false);
  });

  it('renders transactions from the list endpoint', async () => {
    mockAccountListResponse([checkingAccount, savingsAccount]);
    mockTransactionListResponse([groceries, deposit]);
    renderManager();

    expect(await screen.findByText('Weekly shop')).toBeInTheDocument();
    expect(screen.getByText('Paycheck')).toBeInTheDocument();
  });

  it('requests the list with the selected account filter', async () => {
    const user = userEvent.setup();
    const requests: string[] = [];
    mockAccountListResponse([checkingAccount, savingsAccount]);
    mockTransactionListResponse([]);
    renderManager();

    await screen.findByText('No transactions yet');

    // The MSW mock replaces the handler; spy on fetch to observe query params.
    const originalFetch = window.fetch;
    window.fetch = (...args: Parameters<typeof fetch>) => {
      requests.push(String(args[0]));
      return originalFetch(...args);
    };

    await user.click(screen.getByRole('combobox', { name: 'Filter by account' }));
    await user.click(await screen.findByRole('option', { name: 'Everyday Checking' }));

    await waitFor(() => {
      const filtered = requests.filter((url) => url.includes('transaction.list'));
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0]).toContain(encodeURIComponent(checkingAccount.id));
    });
    window.fetch = originalFetch;
  });

  it('offers the household accounts in the add-transaction form', async () => {
    const user = userEvent.setup();
    mockAccountListResponse([checkingAccount, savingsAccount]);
    mockTransactionListResponse([]);
    mockCategoryListResponse([]);
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Add transaction' }));
    await user.click(screen.getByRole('combobox', { name: 'Account' }));

    expect(await screen.findByRole('option', { name: 'Everyday Checking' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Vacation Savings' })).toBeInTheDocument();
  });

  it('opens the edit dialog from the row actions menu', async () => {
    const user = userEvent.setup();
    mockAccountListResponse([checkingAccount]);
    mockTransactionListResponse([groceries]);
    mockCategoryListResponse([]);
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Actions for Weekly shop' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    expect(await screen.findByText('Edit transaction')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toHaveValue('12.50');
  });

  it('opens the delete dialog from the row actions menu', async () => {
    const user = userEvent.setup();
    mockAccountListResponse([checkingAccount]);
    mockTransactionListResponse([groceries]);
    mockCategoryListResponse([]);
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Actions for Weekly shop' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    expect(await screen.findByText('Delete Weekly shop?')).toBeInTheDocument();
  });

  it('opens the transfer edit dialog from a linked transaction', async () => {
    const user = userEvent.setup();
    mockAccountListResponse([checkingAccount, savingsAccount]);
    mockTransactionListResponse([linkedTransaction]);
    mockGetTransferResponse(makeTransfer());
    renderManager();

    await user.click(
      await screen.findByRole('button', { name: 'Actions for Transfer to Savings' })
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    expect(await screen.findByText('Edit transfer')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Save transfer' })).toBeInTheDocument();
  });

  it('deletes a transfer from a linked transaction', async () => {
    const user = userEvent.setup();
    mockAccountListResponse([checkingAccount, savingsAccount]);
    mockTransactionListResponse([linkedTransaction]);
    mockDeleteTransferResponse();
    const fetchSpy = vi.spyOn(window, 'fetch');
    renderManager();

    await user.click(
      await screen.findByRole('button', { name: 'Actions for Transfer to Savings' })
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    expect(await screen.findByText('Delete transfer?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete transfer' }));

    await vi.waitFor(() => {
      const deleteCall = fetchSpy.mock.calls.find(([url]) =>
        String(url).includes('transfer.delete')
      );
      expect(deleteCall).toBeDefined();
      expect(JSON.parse(String(deleteCall![1]?.body))).toEqual({ id: transferId });
    });
    fetchSpy.mockRestore();
  });

  it('shows cards and opens the action sheet on mobile', async () => {
    window.innerWidth = 500;
    const user = userEvent.setup();
    mockAccountListResponse([checkingAccount]);
    mockTransactionListResponse([groceries]);
    mockCategoryListResponse([]);
    renderManager();

    await user.click(await screen.findByRole('button', { name: /Weekly shop/ }));

    expect(await screen.findByRole('heading', { name: 'Weekly shop' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(await screen.findByText('Edit transaction')).toBeInTheDocument();
    window.innerWidth = 1024;
  });
});
