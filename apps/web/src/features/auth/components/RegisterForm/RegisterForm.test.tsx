import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { createQueryClientWrapper } from '@/test/providers.js';

import { server } from '@/test/server.js';

import { RegisterForm } from './RegisterForm.js';

const validEmail = 'new@example.com';
const validPassword = 'Secure-password-1';

async function fillRegistrationForm(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string,
  confirmPassword = password
) {
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/^Password$/i), password);
  await user.type(screen.getByLabelText(/confirm password/i), confirmPassword);
}

function renderRegisterForm(props: Partial<React.ComponentProps<typeof RegisterForm>> = {}) {
  return render(<RegisterForm onSuccess={vi.fn()} {...props} />, {
    wrapper: createQueryClientWrapper(),
  });
}

function mockRegistrationResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/registration.register', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

describe('RegisterForm', () => {
  it('renders the registration fields and submit button', () => {
    renderRegisterForm();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('validates fields before submitting', async () => {
    renderRegisterForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/enter a password/i)).toBeInTheDocument();
    expect(screen.getByText(/confirm your password/i)).toBeInTheDocument();
  });

  it('shows an error for an invalid email and weak password', async () => {
    renderRegisterForm();
    const user = userEvent.setup();

    await fillRegistrationForm(user, 'not-an-email', 'short', 'different');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/password must be at least 12 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    renderRegisterForm();
    const user = userEvent.setup();

    const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const [showPasswordButton] = screen.getAllByRole('button', { name: /show password/i });
    await user.click(showPasswordButton);
    expect(passwordInput.type).toBe('text');

    const [hidePasswordButton] = screen.getAllByRole('button', { name: /hide password/i });
    await user.click(hidePasswordButton);
    expect(passwordInput.type).toBe('password');
  });

  it('calls onSuccess after a valid registration', async () => {
    const onSuccess = vi.fn();
    mockRegistrationResponse({
      ok: true,
      user: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        email: validEmail,
        name: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    renderRegisterForm({ onSuccess });
    const user = userEvent.setup();

    await fillRegistrationForm(user, validEmail, validPassword);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(validEmail);
    });
  });

  it('shows a form error when the email already exists', async () => {
    mockRegistrationResponse({ ok: false, error: 'email-already-exists' });
    renderRegisterForm();
    const user = userEvent.setup();

    await fillRegistrationForm(user, validEmail, validPassword);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/an account with this email already exists/i)).toBeInTheDocument();
    });
  });

  it('shows a form error when the API request fails', async () => {
    server.use(
      http.post('/api/trpc/registration.register', () => {
        return HttpResponse.error();
      })
    );

    renderRegisterForm();
    const user = userEvent.setup();

    await fillRegistrationForm(user, validEmail, validPassword);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
