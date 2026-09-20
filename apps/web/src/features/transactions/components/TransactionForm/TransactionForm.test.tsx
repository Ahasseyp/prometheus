import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAccount } from '@/test/account-helpers.js';
import {
  makeTransaction,
  mockCreateTransactionError,
  mockCreateTransactionResponse,
} from '@/test/transaction-helpers.js';
import { makeCategory, mockCategoryListResponse } from '@/test/category-helpers.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import { createQueryClientWrapper } from '@/test/providers.js';

import { TransactionForm } from './TransactionForm.js';

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
}) as unknown as Account;

const groceries = makeCategory({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Groceries' });
const salary = makeCategory({
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  name: 'Salary',
  type: 'income',
});

function renderForm() {
  const onSuccess = vi.fn();
  render(<TransactionForm accounts={[checkingAccount]} onSuccess={onSuccess} />, {
    wrapper: createQueryClientWrapper(),
  });
  return { onSuccess };
}

describe('TransactionForm', () => {
  beforeEach(() => {
    window.matchMedia = createMatchMedia(false);
  });

  it('submits a new expense with the entered values', async () => {
    const user = userEvent.setup();
    mockCategoryListResponse([groceries, salary]);
    mockCreateTransactionResponse(makeTransaction());
    const fetchSpy = vi.spyOn(window, 'fetch');
    const { onSuccess } = renderForm();

    await user.type(screen.getByLabelText('Amount'), '12.50');

    await user.click(screen.getByRole('combobox', { name: 'Account' }));
    await user.click(await screen.findByRole('option', { name: 'Everyday Checking' }));

    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'Groceries' }));

    await user.type(screen.getByLabelText('Description'), 'Weekly shop');
    await user.click(screen.getByRole('button', { name: 'Add transaction' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    const createCall = fetchSpy.mock.calls.find(([url]) =>
      String(url).includes('transaction.create')
    );
    expect(createCall).toBeDefined();
    const createdPayload = JSON.parse(String(createCall![1]?.body));
    expect(createdPayload).toMatchObject({
      type: 'expense',
      amount: '12.50',
      accountId: checkingAccount.id,
      categoryId: groceries.id,
      description: 'Weekly shop',
    });
    fetchSpy.mockRestore();
  });

  it('only offers categories matching the selected type', async () => {
    const user = userEvent.setup();
    mockCategoryListResponse([groceries, salary]);
    mockCreateTransactionResponse(makeTransaction());
    renderForm();

    await user.click(screen.getByRole('combobox', { name: 'Category' }));

    expect(await screen.findByRole('option', { name: 'Groceries' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Salary' })).not.toBeInTheDocument();
  });

  it('clears the selected category when the type changes', async () => {
    const user = userEvent.setup();
    mockCategoryListResponse([groceries, salary]);
    mockCreateTransactionResponse(makeTransaction());
    renderForm();

    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'Groceries' }));

    await user.click(screen.getByRole('button', { name: 'Income' }));

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue(''));
  });

  it('shows a form error when the mutation fails', async () => {
    const user = userEvent.setup();
    mockCategoryListResponse([groceries]);
    mockCreateTransactionError('Enter a positive amount valid for the account’s currency.');
    renderForm();

    await user.type(screen.getByLabelText('Amount'), '12.50');
    await user.click(screen.getByRole('combobox', { name: 'Account' }));
    await user.click(await screen.findByRole('option', { name: 'Everyday Checking' }));
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'Groceries' }));
    await user.click(screen.getByRole('button', { name: 'Add transaction' }));

    expect(
      await screen.findByText('Enter a positive amount valid for the account’s currency.')
    ).toBeInTheDocument();
  });
});
