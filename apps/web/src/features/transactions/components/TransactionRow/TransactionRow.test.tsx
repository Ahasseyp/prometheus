import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeTransaction } from '@/test/transaction-helpers.js';
import { makeTransferSideTransactions } from '@/test/transfer-helpers.js';
import type { Transaction } from '@/features/transactions/gateways/transactions.js';

import { TransactionRow } from './TransactionRow.js';

function renderRow(transaction: unknown) {
  render(<TransactionRow transaction={transaction as Transaction} />);
}

describe('TransactionRow', () => {
  it('renders an ordinary transaction with its category', () => {
    renderRow(makeTransaction());

    // "Groceries" appears as both the description label and the category cell.
    expect(screen.getAllByText('Groceries')).toHaveLength(2);
    expect(screen.getByText('-USD 12.50')).toBeInTheDocument();
  });

  it('shows the outgoing side of a transfer with the counterparty account', () => {
    const { source } = makeTransferSideTransactions();
    renderRow(source);

    expect(screen.getByText('Transfer to Savings')).toBeInTheDocument();
    expect(screen.getByText('Transfer · to Savings')).toBeInTheDocument();
    expect(screen.getByText('-USD 100.00')).toBeInTheDocument();
  });

  it('shows the incoming side of a transfer with the counterparty account', () => {
    const { destination } = makeTransferSideTransactions();
    renderRow(destination);

    expect(screen.getByText('Transfer from Everyday Checking')).toBeInTheDocument();
    expect(screen.getByText('Transfer · from Everyday Checking')).toBeInTheDocument();
    expect(screen.getByText('USD 100.00')).toBeInTheDocument();
  });
});
