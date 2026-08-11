import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClientWrapper } from '@/test/providers.js';
import { mockCreateAccountError, mockCreateAccountResponse } from '@/test/account-helpers.js';

import { AccountForm } from './AccountForm.js';

const createdAccount = {
  id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  householdId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  name: 'Everyday checking',
  type: 'checking',
  currency: 'USD',
  balance: '0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderAccountForm(props: Partial<React.ComponentProps<typeof AccountForm>> = {}) {
  return render(<AccountForm onSuccess={vi.fn()} {...props} />, {
    wrapper: createQueryClientWrapper(),
  });
}

describe('AccountForm', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { language: 'en-US' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the name, type, and currency fields', () => {
    renderAccountForm();

    expect(screen.getByLabelText(/account name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/account type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add account/i })).toBeInTheDocument();
  });

  it('displays the account type label in the type trigger', () => {
    renderAccountForm();

    expect(screen.getByLabelText(/account type/i)).toHaveTextContent('Checking');
  });

  it('validates the name before submitting', async () => {
    renderAccountForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add account/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter an account name/i)).toBeInTheDocument();
    });
  });

  it('calls onSuccess after a valid submission', async () => {
    const onSuccess = vi.fn();

    mockCreateAccountResponse(createdAccount);

    renderAccountForm({ onSuccess });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/account name/i), 'Everyday checking');
    await user.click(screen.getByRole('button', { name: /add account/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows the server error message inline', async () => {
    mockCreateAccountError('Unsupported currency.');

    renderAccountForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/account name/i), 'Everyday checking');
    await user.click(screen.getByRole('button', { name: /add account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Unsupported currency.');
    });
  });
});
