import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAccount } from '@/test/account-helpers.js';
import {
  makeTransaction,
  mockTransactionListError,
  mockTransactionListResponse,
} from '@/test/transaction-helpers.js';
import { createQueryClientWrapper } from '@/test/providers.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';

import type { Transaction } from '../../gateways/transactions.js';
import { TransactionList } from './TransactionList.js';

const checkingAccount = makeAccount({
  id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  name: 'Everyday Checking',
  currency: 'USD',
}) as unknown as Account;

function renderList(overrides: Partial<Parameters<typeof TransactionList>[0]> = {}) {
  return render(
    <TransactionList
      isLoading={false}
      isError={false}
      onRetry={() => {}}
      isFiltered={false}
      {...overrides}
    />,
    { wrapper: createQueryClientWrapper() }
  );
}

describe('TransactionList', () => {
  it('renders transaction rows with description, date, account, and signed amount', () => {
    mockTransactionListResponse([]);
    renderList({
      transactions: [
        makeTransaction({ description: 'Groceries', amount: '12.50' }) as unknown as Transaction,
      ],
      accounts: [checkingAccount],
    });

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText(/Everyday Checking/)).toBeInTheDocument();
    const amount = screen.getByText(/12\.50/);
    expect(amount.textContent).toMatch(/-|−/);
  });

  it('shows income amounts without a minus sign', () => {
    mockTransactionListResponse([]);
    renderList({
      transactions: [
        makeTransaction({ type: 'income', amount: '2500.00' }) as unknown as Transaction,
      ],
      accounts: [checkingAccount],
    });

    const amount = screen.getByText(/2,500\.00/);
    expect(amount.textContent).not.toMatch(/-|−/);
  });

  it('shows a skeleton while loading', () => {
    renderList({ isLoading: true });
    expect(screen.getByLabelText('Loading transactions')).toBeInTheDocument();
  });

  it('shows an error alert with retry when loading fails', () => {
    mockTransactionListError();
    renderList({ isError: true, onRetry: vi.fn() });

    expect(screen.getByText("We couldn't load your transactions")).toBeInTheDocument();
  });

  it('shows the unfiltered empty state when there are no transactions', () => {
    renderList({ transactions: [] });
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });

  it('shows the filtered empty state when filters are active', () => {
    renderList({ transactions: [], isFiltered: true });
    expect(screen.getByText('No transactions match')).toBeInTheDocument();
  });
});
