import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeTransaction } from '@/test/transaction-helpers.js';
import { makeTransferSideTransactions } from '@/test/transfer-helpers.js';
import type { Transaction } from '@/features/transactions/gateways/transactions.js';

import { TransactionActionSheet } from './TransactionActionSheet.js';

function renderSheet(transaction: unknown) {
  const onClose = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <TransactionActionSheet
      transaction={transaction as Transaction | null}
      onClose={onClose}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
  return { onClose, onEdit, onDelete };
}

describe('TransactionActionSheet', () => {
  it('renders nothing without a transaction', () => {
    const { container } = render(
      <TransactionActionSheet
        transaction={null}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the category of an ordinary transaction', () => {
    renderSheet(makeTransaction());

    expect(screen.getByText('-USD 12.50 · Groceries')).toBeInTheDocument();
  });

  it('shows the transfer direction and counterparty for the outgoing side', () => {
    const { source } = makeTransferSideTransactions();
    renderSheet(source);

    expect(screen.getByText('-USD 100.00 · Transfer · to Savings')).toBeInTheDocument();
  });

  it('shows the transfer direction and counterparty for the incoming side', () => {
    const { destination } = makeTransferSideTransactions();
    renderSheet(destination);

    expect(screen.getByText('USD 100.00 · Transfer · from Everyday Checking')).toBeInTheDocument();
  });

  it('routes edit and delete through the transaction', async () => {
    const user = userEvent.setup();
    const transaction = makeTransaction();
    const { onEdit, onDelete } = renderSheet(transaction);

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(transaction);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(transaction);
  });
});
