import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeTransaction } from '@/test/transaction-helpers.js';
import { makeTransferSideTransactions } from '@/test/transfer-helpers.js';
import type { Transaction } from '@/features/transactions/gateways/transactions.js';

import { TransactionCard } from './TransactionCard.js';

function renderCard(transaction: unknown) {
  render(<TransactionCard transaction={transaction as Transaction} onSelect={vi.fn()} />);
}

describe('TransactionCard', () => {
  it('renders an ordinary transaction with its category and account', () => {
    renderCard(makeTransaction());

    expect(screen.getByText('Groceries · Everyday Checking')).toBeInTheDocument();
    expect(screen.getByText('-USD 12.50')).toBeInTheDocument();
  });

  it('shows the outgoing side of a transfer with direction and counterparty', () => {
    const { source } = makeTransferSideTransactions();
    renderCard(source);

    expect(screen.getByText('Transfer · to Savings · Everyday Checking')).toBeInTheDocument();
    expect(screen.getByText('-USD 100.00')).toBeInTheDocument();
  });

  it('shows the incoming side of a transfer with direction and counterparty', () => {
    const { destination } = makeTransferSideTransactions();
    renderCard(destination);

    expect(screen.getByText('Transfer · from Everyday Checking · Savings')).toBeInTheDocument();
    expect(screen.getByText('USD 100.00')).toBeInTheDocument();
  });
});
