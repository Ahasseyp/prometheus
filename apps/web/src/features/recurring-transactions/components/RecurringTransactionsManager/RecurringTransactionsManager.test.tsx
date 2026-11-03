import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createQueryClientWrapper } from '@/test/providers.js';
import {
  makeRecurringTransaction,
  mockRecurringTransactionListResponse,
} from '@/test/recurring-transaction-helpers.js';

import { RecurringTransactionsManager } from './RecurringTransactionsManager.js';

function renderManager() {
  return render(<RecurringTransactionsManager />, { wrapper: createQueryClientWrapper() });
}

describe('RecurringTransactionsManager', () => {
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
});
