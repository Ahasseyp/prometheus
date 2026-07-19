import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createQueryClientWrapper } from '@/test/providers.js';
import { fillLoginForm, mockLoginError, mockLoginResponse } from '@/test/login-helpers.js';

import { LoginForm } from './LoginForm.js';

const validEmail = 'user@example.com';
const validPassword = 'Secure-password-1';

function renderLoginForm(props: Partial<React.ComponentProps<typeof LoginForm>> = {}) {
  return render(<LoginForm onSuccess={vi.fn()} {...props} />, {
    wrapper: createQueryClientWrapper(),
  });
}

describe('LoginForm', () => {
  it('renders the login fields and submit button', () => {
    renderLoginForm();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('validates fields before submitting', async () => {
    renderLoginForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/enter a password/i)).toBeInTheDocument();
  });

  it('shows an error for an invalid email', async () => {
    renderLoginForm();
    const user = userEvent.setup();

    await fillLoginForm(user, 'not-an-email', validPassword);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    renderLoginForm();
    const user = userEvent.setup();

    const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const showPasswordButton = screen.getByRole('button', { name: /show password/i });
    await user.click(showPasswordButton);
    expect(passwordInput.type).toBe('text');

    const hidePasswordButton = screen.getByRole('button', { name: /hide password/i });
    await user.click(hidePasswordButton);
    expect(passwordInput.type).toBe('password');
  });

  it('calls onSuccess after a valid login', async () => {
    const onSuccess = vi.fn();
    mockLoginResponse({
      ok: true,
      user: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        email: validEmail,
        name: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    renderLoginForm({ onSuccess });
    const user = userEvent.setup();

    await fillLoginForm(user, validEmail, validPassword);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          email: validEmail,
        })
      );
    });
  });

  it('shows a form error when the credentials are invalid', async () => {
    mockLoginResponse({ ok: false, error: 'invalid-credentials' });
    renderLoginForm();
    const user = userEvent.setup();

    await fillLoginForm(user, validEmail, validPassword);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/incorrect email or password/i)).toBeInTheDocument();
    });
  });

  it('shows a form error when the API request fails', async () => {
    mockLoginError();

    renderLoginForm();
    const user = userEvent.setup();

    await fillLoginForm(user, validEmail, validPassword);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
