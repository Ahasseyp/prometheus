import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithRouter } from '@/test/render-router.js';

import { App } from './App.js';

vi.mock('@/lib/env.js', () => ({
  isRegistrationEnabled: () => true,
}));

describe('App homepage', () => {
  it('renders the value proposition and sign-in link', async () => {
    await renderWithRouter(App);

    expect(screen.getByRole('heading', { name: /your money, clearly/i })).toBeInTheDocument();
    expect(screen.getByText(/prometheus tracks spending/i)).toBeInTheDocument();

    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toHaveAttribute('href', '/login');
  });

  it('renders the create account link when registration is enabled', async () => {
    await renderWithRouter(App);

    const createAccountLink = screen.getByRole('link', { name: /create account/i });
    expect(createAccountLink).toHaveAttribute('href', '/register');
  });
});
