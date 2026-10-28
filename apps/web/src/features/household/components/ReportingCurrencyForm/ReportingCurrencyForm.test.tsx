import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { createQueryClientWrapper } from '@/test/providers.js';
import { server } from '@/test/server.js';

import { ReportingCurrencyForm } from './ReportingCurrencyForm.js';

function renderReportingCurrencyForm() {
  return render(<ReportingCurrencyForm reportingCurrency="USD" />, {
    wrapper: createQueryClientWrapper(),
  });
}

describe('ReportingCurrencyForm', () => {
  it('saves the selected Reporting Currency', async () => {
    let submittedCurrency: string | undefined;
    server.use(
      http.post('/api/trpc/household.updateReportingCurrency', async ({ request }) => {
        const body = (await request.json()) as { reportingCurrency?: string };
        submittedCurrency = body.reportingCurrency;
        return HttpResponse.json({
          result: {
            data: {
              ok: true,
              household: { id: 'household-1', name: 'Home', reportingCurrency: 'EUR' },
            },
          },
        });
      })
    );

    renderReportingCurrencyForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole('combobox', { name: /reporting currency/i }));
    await user.click(await screen.findByRole('option', { name: /euro \(EUR\)/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(submittedCurrency).toBe('EUR');
    });
  });

  it('cancels an unsaved Currency selection', async () => {
    renderReportingCurrencyForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole('combobox', { name: /reporting currency/i }));
    await user.click(await screen.findByRole('option', { name: /euro \(EUR\)/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.getByRole('combobox', { name: /reporting currency/i })).toHaveValue(
      'US Dollar (USD)'
    );
  });

  it('shows an API error without losing the selected Currency', async () => {
    server.use(
      http.post('/api/trpc/household.updateReportingCurrency', () => HttpResponse.error())
    );

    renderReportingCurrencyForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole('combobox', { name: /reporting currency/i }));
    await user.click(await screen.findByRole('option', { name: /euro \(EUR\)/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /reporting currency/i })).toHaveValue('Euro (EUR)');
  });
});
