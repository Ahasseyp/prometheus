import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClientWrapper } from '@/test/providers.js';
import {
  makeAccount,
  mockAccountListError,
  mockAccountListResponse,
  mockAccountListResponseThenEmptyAfterDelete,
  mockDeleteAccountResponse,
} from '@/test/account-helpers.js';

import { AccountsManager } from './AccountsManager.js';

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
  type: 'checking',
  balance: '4820.35',
});

const creditCardAccount = makeAccount({
  id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
  name: 'Travel Card',
  type: 'credit card',
  balance: '-1240.50',
});

const loanAccount = makeAccount({
  id: 'e5f6a7b8-c9d0-1234-efab-345678901234',
  name: 'Mortgage',
  type: 'loan',
  balance: '250000.00',
});

function renderAccountsManager() {
  return render(<AccountsManager />, { wrapper: createQueryClientWrapper() });
}

describe('AccountsManager', () => {
  beforeEach(() => {
    window.matchMedia = createMatchMedia(false);
  });

  it('renders account rows with balances in their own currency', async () => {
    mockAccountListResponse([checkingAccount, creditCardAccount, loanAccount]);
    renderAccountsManager();

    expect(await screen.findByText('Everyday Checking')).toBeInTheDocument();
    expect(screen.getByText('Travel Card')).toBeInTheDocument();
    expect(screen.getByText('Mortgage')).toBeInTheDocument();
    expect(screen.getByText(/4,820\.35/)).toHaveTextContent(/USD/);
  });

  it('shows negative balances with a minus sign and destructive color', async () => {
    mockAccountListResponse([creditCardAccount]);
    renderAccountsManager();

    const balance = await screen.findByText(/1,240\.50/);

    expect(balance.textContent).toMatch(/-|−/);
    expect(balance).toHaveClass('text-destructive');
  });

  it('shows a teaching empty state when there are no accounts', async () => {
    mockAccountListResponse([]);
    renderAccountsManager();

    expect(await screen.findByText('Add your first account')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /add account/i })).toHaveLength(1);
  });

  it('hides the header create button while loading and when the list is empty', async () => {
    mockAccountListResponse([]);
    renderAccountsManager();

    const pageHeader = screen.getByRole('heading', { name: 'Accounts' }).closest('header');
    if (pageHeader == null) {
      throw new Error('Accounts page header not found');
    }

    expect(
      within(pageHeader).queryByRole('button', { name: /add account/i })
    ).not.toBeInTheDocument();

    expect(await screen.findByText('Add your first account')).toBeInTheDocument();
    expect(
      within(pageHeader).queryByRole('button', { name: /add account/i })
    ).not.toBeInTheDocument();
  });

  it('shows an inline error with retry when the list fails', async () => {
    mockAccountListError();
    renderAccountsManager();

    expect(await screen.findByText(/couldn't load your accounts/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('asks for confirmation naming the account before deleting', async () => {
    mockAccountListResponse([checkingAccount]);
    mockDeleteAccountResponse();
    renderAccountsManager();
    const user = userEvent.setup();

    await screen.findByText('Everyday Checking');
    await user.click(screen.getByRole('button', { name: /actions for everyday checking/i }));
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Delete Everyday Checking?');
    expect(dialog).toHaveTextContent("This can't be undone.");
  });

  it('removes the account from the list after confirming deletion', async () => {
    mockAccountListResponseThenEmptyAfterDelete([checkingAccount]);
    renderAccountsManager();
    const user = userEvent.setup();

    await screen.findByText('Everyday Checking');
    await user.click(screen.getByRole('button', { name: /actions for everyday checking/i }));
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }));
    await user.click(screen.getByRole('button', { name: /delete account/i }));

    await waitFor(() => {
      expect(screen.queryByText('Everyday Checking')).not.toBeInTheDocument();
    });
  });
});
