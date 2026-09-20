import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAccount, mockAccountListResponse } from '@/test/account-helpers.js';
import { makeTransaction, mockTransactionListResponse } from '@/test/transaction-helpers.js';
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
  description: 'Groceries',
});

const deposit = makeTransaction({
  id: 'a7b8c9d0-e1f2-3456-abcd-567890123456',
  accountId: savingsAccount.id,
  type: 'income',
  amount: '500.00',
  description: 'Paycheck',
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

    expect(await screen.findByText('Groceries')).toBeInTheDocument();
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
});
