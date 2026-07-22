import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithRouter } from '@/test/render-router.js';
import { fillLoginForm, mockLoginResponse } from '@/test/login-helpers.js';

import { LoginPage } from './login.js';

const validEmail = 'user@example.com';
const validPassword = 'Secure-password-1';

async function renderLoginPage(props: Partial<React.ComponentProps<typeof LoginPage>> = {}) {
  return renderWithRouter(() => <LoginPage {...props} />);
}

describe('LoginPage', () => {
  it('renders the login form', async () => {
    await renderLoginPage();

    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls onSuccess and navigates home after a valid login', async () => {
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

    await renderLoginPage({ onSuccess });
    const user = userEvent.setup();

    await fillLoginForm(user, validEmail, validPassword);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ email: validEmail }));
    });
  });
});
