import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithRouter } from '@/test/render-router.js';
import { mockMeResponse } from '@/test/login-helpers.js';
import { mockHouseholdMeResponse } from '@/test/household-helpers.js';
import { makeAccount, mockAccountListResponse } from '@/test/account-helpers.js';

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

    await renderWithRouter(() => <OverviewPage />);

    const totals = await screen.findAllByText(/750\.00/);
    expect(totals[0]).toHaveTextContent(/USD/);
  });

  it('lists one total per currency when accounts use multiple currencies', async () => {
    mockAuthenticatedHousehold();
    mockAccountListResponse([
      makeAccount({ name: 'Checking', balance: '100.00', currency: 'USD' }),
      makeAccount({
        id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
        name: 'Yen savings',
        type: 'savings',
        balance: '1500',
        currency: 'JPY',
      }),
    ]);

    await renderWithRouter(() => <OverviewPage />);

    const usdTotals = await screen.findAllByText(/100\.00/);
    expect(usdTotals.some((element) => element.textContent?.includes('USD'))).toBe(true);
    const jpyTotals = screen.getAllByText(/1,500/);
    expect(jpyTotals.some((element) => element.textContent?.includes('JPY'))).toBe(true);
    expect(screen.getByText(/across 2 currencies/i)).toBeInTheDocument();
  });

  it('links the accounts card to the full accounts page', async () => {
    mockAuthenticatedHousehold();
    mockAccountListResponse([]);

    await renderWithRouter(() => <OverviewPage />);

    expect(await screen.findByRole('link', { name: /view all/i })).toBeInTheDocument();
  });
});
