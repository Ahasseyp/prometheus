import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  makeTransaction,
  mockTransactionListError,
  mockTransactionListResponse,
} from '@/test/transaction-helpers.js';
import { createQueryClientWrapper } from '@/test/providers.js';

import type { Transaction } from '../../gateways/transactions.js';
import { TransactionList } from './TransactionList.js';

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
  it('renders transaction rows with description, date, category, account, and signed amount', () => {
    mockTransactionListResponse([]);
    renderList({
      transactions: [
        makeTransaction({
          description: 'Weekly shop',
          amount: '12.50',
          accountName: 'Everyday Checking',
          categoryName: 'Groceries',
        }) as unknown as Transaction,
      ],
    });

    expect(screen.getByText('Weekly shop')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Groceries' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Everyday Checking' })).toBeInTheDocument();
    const amount = screen.getByText(/12\.50/);
    expect(amount.textContent).toMatch(/-|−/);
  });

  it('falls back to the category name when there is no description', () => {
    mockTransactionListResponse([]);
    renderList({
      transactions: [
        makeTransaction({ description: '', categoryName: 'Groceries' }) as unknown as Transaction,
      ],
    });

    expect(screen.getAllByText('Groceries').length).toBeGreaterThanOrEqual(2);
  });

  it('shows income amounts without a minus sign', () => {
    mockTransactionListResponse([]);
    renderList({
      transactions: [
        makeTransaction({ type: 'income', amount: '2500.00' }) as unknown as Transaction,
      ],
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
