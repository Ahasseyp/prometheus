import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderWithRouter } from '@/test/render-router.js';
import { server } from '@/test/server.js';

import { RegisterPage } from './register.js';

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

async function renderRegisterPage(isEnabled = true) {
  return renderWithRouter(() => <RegisterPage isEnabled={isEnabled} />);
}

function mockRegistrationResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/registration.register', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

describe('RegisterPage', () => {
  it('shows a disabled message when registration is not enabled', async () => {
    await renderRegisterPage(false);

    expect(screen.getByRole('heading', { name: /registration unavailable/i })).toBeInTheDocument();
    expect(screen.getByText(/new account creation is currently disabled/i)).toBeInTheDocument();
  });

  it('renders the registration form when enabled', async () => {
    await renderRegisterPage(true);

    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows a success state after a valid registration', async () => {
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

    await renderRegisterPage(true);
    const user = userEvent.setup();

    await fillRegistrationForm(user, validEmail, validPassword);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /account created/i })).toBeInTheDocument();
    });
    expect(screen.getByText(validEmail)).toBeInTheDocument();
  });
});
