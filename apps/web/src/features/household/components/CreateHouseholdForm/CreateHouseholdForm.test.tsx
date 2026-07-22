import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClientWrapper } from '@/test/providers.js';
import {
  mockCreateHouseholdError,
  mockCreateHouseholdResponse,
  mockHouseholdMeResponse,
} from '@/test/household-helpers.js';

import { CreateHouseholdForm } from './CreateHouseholdForm.js';

const validName = 'Home';
const validCurrency = 'USD';

function renderCreateHouseholdForm(
  props: Partial<React.ComponentProps<typeof CreateHouseholdForm>> = {}
) {
  return render(<CreateHouseholdForm onSuccess={vi.fn()} {...props} />, {
    wrapper: createQueryClientWrapper(),
  });
}

describe('CreateHouseholdForm', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { language: 'en-US' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the household name and currency fields', () => {
    renderCreateHouseholdForm();

    expect(screen.getByLabelText(/household name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reporting currency/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create household/i })).toBeInTheDocument();
  });

  it('validates fields before submitting', async () => {
    renderCreateHouseholdForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /create household/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter a household name/i)).toBeInTheDocument();
    });
  });

  it('calls onSuccess after a valid submission', async () => {
    const onSuccess = vi.fn();

    mockHouseholdMeResponse({ household: null });
    mockCreateHouseholdResponse({
      ok: true,
      household: {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        name: validName,
        reportingCurrency: validCurrency,
      },
    });

    renderCreateHouseholdForm({ onSuccess });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/household name/i), validName);
    await user.click(screen.getByRole('combobox', { name: /reporting currency/i }));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /us dollar \(USD\)/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('option', { name: /us dollar \(USD\)/i }));
    await user.click(screen.getByRole('button', { name: /create household/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          household: expect.objectContaining({ name: validName, reportingCurrency: validCurrency }),
        })
      );
    });
  });

  it('shows a form error when the API request fails', async () => {
    mockHouseholdMeResponse({ household: null });
    mockCreateHouseholdError();

    renderCreateHouseholdForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/household name/i), validName);
    await user.click(screen.getByRole('button', { name: /create household/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
