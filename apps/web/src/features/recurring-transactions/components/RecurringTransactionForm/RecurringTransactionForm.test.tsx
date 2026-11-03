import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAccount, mockAccountListResponse } from '@/test/account-helpers.js';
import { makeCategory, mockCategoryListResponse } from '@/test/category-helpers.js';
import { mockMatchMedia } from '@/test/match-media.js';
import {
  mockCreateRecurringTransactionError,
  mockCreateRecurringTransactionResponse,
} from '@/test/recurring-transaction-helpers.js';
import { createQueryClientWrapper } from '@/test/providers.js';

import { RecurringTransactionForm } from './RecurringTransactionForm.js';

const checkingAccount = makeAccount({
  id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  name: 'Everyday Checking',
});

const groceries = makeCategory({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Groceries' });
const salary = makeCategory({
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  name: 'Salary',
  type: 'income',
});

function renderForm() {
  const onSuccess = vi.fn();
  render(<RecurringTransactionForm onSuccess={onSuccess} />, {
    wrapper: createQueryClientWrapper(),
  });
  return { onSuccess };
}

describe('RecurringTransactionForm', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    mockAccountListResponse([checkingAccount]);
  });

  it('submits a new monthly expense schedule with the entered values', async () => {
    const user = userEvent.setup();
    mockCategoryListResponse([groceries, salary]);
    mockCreateRecurringTransactionResponse({
      ...groceries,
      id: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
    });
    const fetchSpy = vi.spyOn(window, 'fetch');
    const { onSuccess } = renderForm();

    await user.type(screen.getByLabelText('Amount'), '42.50');

    await user.click(screen.getByRole('combobox', { name: 'Account' }));
    await user.click(await screen.findByRole('option', { name: 'Everyday Checking' }));

    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'Groceries' }));

    // Default interval is 1 and default period is month; leave them as-is.
    await user.type(screen.getByLabelText('Description'), 'Rent');
    await user.click(screen.getByRole('button', { name: 'Add schedule' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    const createCall = fetchSpy.mock.calls.find(([url]) =>
      String(url).includes('recurringTransaction.create')
    );
    expect(createCall).toBeDefined();
    const createdPayload = JSON.parse(String(createCall![1]?.body));
    expect(createdPayload).toMatchObject({
      type: 'expense',
      amount: '42.50',
      accountId: checkingAccount.id,
      categoryId: groceries.id,
      period: 'month',
      interval: 1,
      description: 'Rent',
    });
    expect(createdPayload).toHaveProperty('startDate');
    fetchSpy.mockRestore();
  });

  it('only offers categories matching the selected type', async () => {
    const user = userEvent.setup();
    mockCategoryListResponse([groceries, salary]);
    mockCreateRecurringTransactionResponse({ id: 'r1' });
    renderForm();

    await user.click(screen.getByRole('combobox', { name: 'Category' }));

    expect(await screen.findByRole('option', { name: 'Groceries' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Salary' })).not.toBeInTheDocument();
  });

  it('clears the selected category when the type changes', async () => {
    const user = userEvent.setup();
    mockCategoryListResponse([groceries, salary]);
    mockCreateRecurringTransactionResponse({ id: 'r1' });
    renderForm();

    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'Groceries' }));

    await user.click(screen.getByRole('button', { name: 'Income' }));

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue(''));
  });

  it('shows a form error when the mutation fails', async () => {
    const user = userEvent.setup();
    mockCategoryListResponse([groceries]);
    mockCreateRecurringTransactionError('Enter a positive amount.');
    renderForm();

    await user.type(screen.getByLabelText('Amount'), '42.50');
    await user.click(screen.getByRole('combobox', { name: 'Account' }));
    await user.click(await screen.findByRole('option', { name: 'Everyday Checking' }));
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'Groceries' }));
    await user.click(screen.getByRole('button', { name: 'Add schedule' }));

    expect(await screen.findByText('Enter a positive amount.')).toBeInTheDocument();
  });
});
