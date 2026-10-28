import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithRouter } from '@/test/render-router.js';
import { mockMeResponse } from '@/test/login-helpers.js';
import { mockHouseholdMeResponse } from '@/test/household-helpers.js';
import { makeAccount, mockAccountListResponse } from '@/test/account-helpers.js';
import { mockReportingSummaryResponse } from '@/test/reporting-helpers.js';

import { OverviewPage } from './overview.js';

const mockUser = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: 'user@example.com',
  name: 'Alex User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockHousehold = {
  household: {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    name: 'My Household',
    reportingCurrency: 'USD',
    role: 'OWNER',
  },
};

function mockAuthenticatedHousehold() {
  mockMeResponse(mockUser);
  mockHouseholdMeResponse(mockHousehold);
  mockReportingSummaryResponse({ reportingCurrency: 'USD', netWorth: '0', accounts: [] });
}

describe('OverviewPage', () => {
  it('welcomes the user with the household name', async () => {
    mockAuthenticatedHousehold();
    mockAccountListResponse([]);

    await renderWithRouter(() => <OverviewPage />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /my household overview/i })
    ).toBeInTheDocument();
  });

  it('shows a single total when all accounts share one currency', async () => {
    mockAuthenticatedHousehold();
    mockAccountListResponse([
      makeAccount({ name: 'Checking', balance: '1000.00' }),
      makeAccount({
        id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
        name: 'Savings',
        type: 'savings',
        balance: '250.00',
      }),
    ]);
    mockReportingSummaryResponse({ reportingCurrency: 'USD', netWorth: '1250.00', accounts: [] });

    await renderWithRouter(() => <OverviewPage />);

    const totals = await screen.findAllByText(/1,250\.00/);
    expect(totals[0]).toHaveTextContent(/USD/);
  });

  it('subtracts loan balances from the total', async () => {
    mockAuthenticatedHousehold();
    mockAccountListResponse([
      makeAccount({ name: 'Checking', balance: '1000.00' }),
      makeAccount({
        id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
        name: 'Mortgage',
        type: 'loan',
        balance: '250.00',
      }),
    ]);
    mockReportingSummaryResponse({ reportingCurrency: 'USD', netWorth: '750.00', accounts: [] });

    await renderWithRouter(() => <OverviewPage />);

    const totals = await screen.findAllByText(/750\.00/);
    expect(totals[0]).toHaveTextContent(/USD/);
  });

  it('shows Reporting Currency net worth and toggles converted Account balances', async () => {
    mockAuthenticatedHousehold();
    const accounts = [
      makeAccount({ name: 'Checking', balance: '100.00', currency: 'USD' }),
      makeAccount({
        id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
        name: 'Yen savings',
        type: 'savings',
        balance: '1500',
        currency: 'JPY',
      }),
    ];
    mockAccountListResponse(accounts);
    mockReportingSummaryResponse({
      reportingCurrency: 'USD',
      netWorth: '150.00',
      accounts: accounts.map((account) => ({
        ...account,
        convertedBalance: account.currency === 'USD' ? '100.00' : '50.00',
        exchangeRate: account.currency === 'USD' ? '1' : '0.0333333333',
      })),
    });

    await renderWithRouter(() => <OverviewPage />);

    expect(await screen.findByText(/USD 150\.00/)).toBeInTheDocument();
    expect(screen.getByText(/JPY 1,500/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /converted balances/i }));

    expect(screen.getByText(/USD 50\.00/)).toBeInTheDocument();
    expect(screen.queryByText(/JPY 1,500/)).not.toBeInTheDocument();
  });

  it('links the accounts card to the full accounts page', async () => {
    mockAuthenticatedHousehold();
    mockAccountListResponse([]);

    await renderWithRouter(() => <OverviewPage />);

    expect(await screen.findByRole('link', { name: /view all/i })).toBeInTheDocument();
  });
});
