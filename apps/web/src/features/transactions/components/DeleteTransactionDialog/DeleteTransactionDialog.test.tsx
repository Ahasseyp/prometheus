import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeTransaction, mockDeleteTransactionResponse } from '@/test/transaction-helpers.js';
import { createQueryClientWrapper } from '@/test/providers.js';
import type { Transaction } from '@/features/transactions/gateways/transactions.js';

import { DeleteTransactionDialog } from './DeleteTransactionDialog.js';

const groceriesTransaction = makeTransaction({
  id: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
  description: 'Weekly shop',
  categoryName: 'Groceries',
}) as unknown as Transaction;

function renderDialog() {
  const onClose = vi.fn();
  render(<DeleteTransactionDialog transaction={groceriesTransaction} onClose={onClose} />, {
    wrapper: createQueryClientWrapper(),
  });
  return { onClose };
}

describe('DeleteTransactionDialog', () => {
  it('deletes the transaction and closes on confirm', async () => {
    const user = userEvent.setup();
    mockDeleteTransactionResponse();
    const fetchSpy = vi.spyOn(window, 'fetch');
    const { onClose } = renderDialog();

    expect(screen.getByText('Delete Weekly shop?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete transaction' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const deleteCall = fetchSpy.mock.calls.find(([url]) =>
      String(url).includes('transaction.delete')
    );
    expect(deleteCall).toBeDefined();
    expect(JSON.parse(String(deleteCall![1]?.body))).toMatchObject({
      id: groceriesTransaction.id,
    });
    fetchSpy.mockRestore();
  });

  it('falls back to the category name in the title when there is no description', () => {
    mockDeleteTransactionResponse();
    render(
      <DeleteTransactionDialog
        transaction={{ ...groceriesTransaction, description: '' }}
        onClose={vi.fn()}
      />,
      { wrapper: createQueryClientWrapper() }
    );

    expect(screen.getByText('Delete Groceries?')).toBeInTheDocument();
  });

  it('closes without deleting on cancel', async () => {
    const user = userEvent.setup();
    mockDeleteTransactionResponse();
    const fetchSpy = vi.spyOn(window, 'fetch');
    const { onClose } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('transaction.delete'))).toBe(
      false
    );
    fetchSpy.mockRestore();
  });
});
