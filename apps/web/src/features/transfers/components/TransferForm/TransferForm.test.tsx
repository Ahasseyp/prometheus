import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeAccount } from '@/test/account-helpers.js';
import {
  makeTransfer,
  mockCreateTransferError,
  mockCreateTransferResponse,
  mockUpdateTransferError,
  mockUpdateTransferResponse,
} from '@/test/transfer-helpers.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import type { Transfer } from '@/features/transfers/gateways/transfers.js';
import { createQueryClientWrapper } from '@/test/providers.js';
import { makeTransaction } from '@/test/transaction-helpers.js';

import { TransferForm } from './TransferForm.js';

const checkingAccount = makeAccount({
  id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  name: 'Everyday Checking',
  currency: 'USD',
}) as unknown as Account;

const savingsAccount = makeAccount({
  id: 'e5f6a7b8-c9d0-1234-efab-345678901234',
  name: 'Savings',
  currency: 'USD',
}) as unknown as Account;

const mxnAccount = makeAccount({
  id: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
  name: 'MXN Cash',
  currency: 'MXN',
}) as unknown as Account;

function renderForm(accounts: Account[] = [checkingAccount, savingsAccount]) {
  const onSuccess = vi.fn();
  render(<TransferForm accounts={accounts} onSuccess={onSuccess} />, {
    wrapper: createQueryClientWrapper(),
  });
  return { onSuccess };
}

async function selectAccount(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  name: string
) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name }));
}

describe('TransferForm', () => {
  it('submits a same-currency transfer without an Exchange Rate', async () => {
    const user = userEvent.setup();
    mockCreateTransferResponse(makeTransfer());
    const fetchSpy = vi.spyOn(window, 'fetch');
    const { onSuccess } = renderForm();

    await selectAccount(user, 'From', 'Everyday Checking');
    await selectAccount(user, 'To', 'Savings');
    await user.type(screen.getByLabelText('Amount'), '100.00');
    await user.type(screen.getByLabelText('Description'), 'Monthly savings');
    await user.click(screen.getByRole('button', { name: 'Add transfer' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    const createCall = fetchSpy.mock.calls.find(([url]) => String(url).includes('transfer.create'));
    expect(createCall).toBeDefined();
    const payload = JSON.parse(String(createCall![1]?.body));
    expect(payload).toMatchObject({
      sourceAccountId: checkingAccount.id,
      destinationAccountId: savingsAccount.id,
      amount: '100.00',
      description: 'Monthly savings',
    });
    expect(payload).not.toHaveProperty('exchangeRate');
    expect(payload).not.toHaveProperty('destinationAmount');
    fetchSpy.mockRestore();
  });

  it('submits the Exchange Rate and derived destination amount cross-currency', async () => {
    const user = userEvent.setup();
    mockCreateTransferResponse(makeTransfer({ exchangeRate: '0.05' }));
    const fetchSpy = vi.spyOn(window, 'fetch');
    const { onSuccess } = renderForm([checkingAccount, mxnAccount]);

    await selectAccount(user, 'From', 'MXN Cash');
    await selectAccount(user, 'To', 'Everyday Checking');
    await user.type(screen.getByLabelText('Amount'), '100000.00');

    const rateInput = screen.getByLabelText('Exchange Rate');
    expect(rateInput).toBeInTheDocument();
    await user.type(rateInput, '0.05');

    expect(await screen.findByText(/5,000\.00/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Description'), 'Rent conversion');
    await user.click(screen.getByRole('button', { name: 'Add transfer' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    const createCall = fetchSpy.mock.calls.find(([url]) => String(url).includes('transfer.create'));
    const payload = JSON.parse(String(createCall![1]?.body));
    expect(payload).toMatchObject({
      sourceAccountId: mxnAccount.id,
      destinationAccountId: checkingAccount.id,
      amount: '100000.00',
      exchangeRate: '0.05',
      destinationAmount: '5000.00',
    });
    fetchSpy.mockRestore();
  });

  it('excludes the selected source account from the destination options', async () => {
    const user = userEvent.setup();
    renderForm();

    await selectAccount(user, 'From', 'Everyday Checking');
    await user.click(screen.getByRole('combobox', { name: 'To' }));

    expect(screen.queryByRole('option', { name: 'Everyday Checking' })).not.toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Savings' })).toBeInTheDocument();
  });

  it('excludes the selected destination account from the source options', async () => {
    const user = userEvent.setup();
    renderForm();

    await selectAccount(user, 'To', 'Savings');
    await user.click(screen.getByRole('combobox', { name: 'From' }));

    expect(screen.queryByRole('option', { name: 'Savings' })).not.toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Everyday Checking' })).toBeInTheDocument();
  });

  it('requires an Exchange Rate for cross-currency transfers', async () => {
    const user = userEvent.setup();
    mockCreateTransferResponse(makeTransfer());
    renderForm([checkingAccount, mxnAccount]);

    await selectAccount(user, 'From', 'MXN Cash');
    await selectAccount(user, 'To', 'Everyday Checking');
    await user.type(screen.getByLabelText('Amount'), '1000.00');
    await user.click(screen.getByRole('button', { name: 'Add transfer' }));

    expect(await screen.findByText('Enter an Exchange Rate.')).toBeInTheDocument();
  });

  it('omits a blank description so the backend default applies', async () => {
    const user = userEvent.setup();
    mockCreateTransferResponse(makeTransfer());
    const fetchSpy = vi.spyOn(window, 'fetch');
    const { onSuccess } = renderForm();

    await selectAccount(user, 'From', 'Everyday Checking');
    await selectAccount(user, 'To', 'Savings');
    await user.type(screen.getByLabelText('Amount'), '100.00');
    await user.click(screen.getByRole('button', { name: 'Add transfer' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    const createCall = fetchSpy.mock.calls.find(([url]) => String(url).includes('transfer.create'));
    const payload = JSON.parse(String(createCall![1]?.body));
    expect(payload).not.toHaveProperty('description');
    fetchSpy.mockRestore();
  });

  it('shows a form error when the mutation fails', async () => {
    const user = userEvent.setup();
    mockCreateTransferError('The source and destination Accounts must be different.');
    renderForm();

    await selectAccount(user, 'From', 'Everyday Checking');
    await selectAccount(user, 'To', 'Savings');
    await user.type(screen.getByLabelText('Amount'), '100.00');
    await user.type(screen.getByLabelText('Description'), 'Monthly savings');
    await user.click(screen.getByRole('button', { name: 'Add transfer' }));

    expect(
      await screen.findByText('The source and destination Accounts must be different.')
    ).toBeInTheDocument();
  });

  it('prefills the form from an existing transfer and submits an update', async () => {
    const user = userEvent.setup();
    const transfer = makeTransfer({
      sourceTransaction: makeTransaction({
        accountId: checkingAccount.id,
        accountName: 'Everyday Checking',
        amount: '250.00',
        description: 'Monthly savings',
      }),
      destinationTransaction: makeTransaction({
        accountId: savingsAccount.id,
        accountName: 'Savings',
        type: 'income',
        amount: '250.00',
        description: 'Monthly savings',
      }),
    });
    mockUpdateTransferResponse(transfer);
    const fetchSpy = vi.spyOn(window, 'fetch');
    const onSuccess = vi.fn();
    render(
      <TransferForm
        accounts={[checkingAccount, savingsAccount]}
        transfer={transfer as unknown as Transfer}
        onSuccess={onSuccess}
      />,
      { wrapper: createQueryClientWrapper() }
    );

    expect(screen.getByRole('button', { name: 'Save transfer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toHaveValue('250.00');
    expect(screen.getByLabelText('Description')).toHaveValue('Monthly savings');

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '300.00');
    await user.click(screen.getByRole('button', { name: 'Save transfer' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    const updateCall = fetchSpy.mock.calls.find(([url]) => String(url).includes('transfer.update'));
    expect(updateCall).toBeDefined();
    const payload = JSON.parse(String(updateCall![1]?.body));
    expect(payload).toMatchObject({
      id: transfer.id,
      sourceAccountId: checkingAccount.id,
      destinationAccountId: savingsAccount.id,
      amount: '300.00',
      description: 'Monthly savings',
    });
    expect(payload).not.toHaveProperty('exchangeRate');
    expect(payload).not.toHaveProperty('destinationAmount');
    fetchSpy.mockRestore();
  });

  it('shows a form error when the update fails', async () => {
    const user = userEvent.setup();
    const transfer = makeTransfer();
    mockUpdateTransferError('The Exchange Rate does not match the source and destination amounts.');
    render(
      <TransferForm
        accounts={[checkingAccount, savingsAccount]}
        transfer={transfer as unknown as Transfer}
        onSuccess={vi.fn()}
      />,
      { wrapper: createQueryClientWrapper() }
    );

    await user.click(screen.getByRole('button', { name: 'Save transfer' }));

    expect(
      await screen.findByText(
        'The Exchange Rate does not match the source and destination amounts.'
      )
    ).toBeInTheDocument();
  });
});
