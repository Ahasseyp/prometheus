import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server } from '@/test/server.js';
import { mockMatchMedia } from '@/test/match-media.js';
import {
  makeGoal,
  makeGoalContribution,
  mockCreateGoalContributionError,
  mockDeleteGoalContributionResponse,
  mockDeleteGoalResponse,
  mockGoalContributionListResponse,
  mockGoalListError,
  mockGoalListResponse,
} from '@/test/goal-helpers.js';
import { makeAccount, mockAccountListResponse } from '@/test/account-helpers.js';
import { createQueryClientWrapper } from '@/test/providers.js';

import { GoalsManager } from './GoalsManager.js';

const vacationGoal = makeGoal({
  id: 'e5f6a7b8-c9d0-1234-abcd-345678901234',
  name: 'Vacation',
  target: '2500.00',
  savedAmount: '0.00',
  deadline: '2027-06-30T00:00:00.000Z',
});

const laptopGoal = makeGoal({
  id: 'f6a7b8c9-d0e1-2345-bcde-456789012345',
  name: 'Laptop',
  target: '1500.00',
  savedAmount: '300.00',
  deadline: '2027-01-15T00:00:00.000Z',
});

function renderManager() {
  return render(<GoalsManager />, { wrapper: createQueryClientWrapper() });
}

describe('GoalsManager', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    window.innerWidth = 1024;
  });

  it('renders goals with saved progress, deadline, and currency', async () => {
    mockGoalListResponse([vacationGoal, laptopGoal]);
    mockGoalContributionListResponse([]);
    renderManager();

    expect(await screen.findByText('Vacation')).toBeInTheDocument();
    expect(screen.getByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText(/0\.00.*of.*2,500\.00.*saved/)).toBeInTheDocument();
    expect(screen.getByText(/300\.00.*of.*1,500\.00.*saved/)).toBeInTheDocument();
    // Deadlines render in the local timezone, so the day can shift for UTC
    // midnight fixtures.
    expect(screen.getByText(/Due Jun (29|30), 2027/)).toBeInTheDocument();
    expect(screen.getByText(/Due Jan (14|15), 2027/)).toBeInTheDocument();
    expect(screen.getAllByText('USD')).toHaveLength(2);
    expect(screen.getAllByText('No contributions yet.')).toHaveLength(2);
  });

  it('shows an empty state when there are no goals', async () => {
    mockGoalListResponse([]);
    renderManager();

    expect(await screen.findByText('No goals yet')).toBeInTheDocument();
  });

  it('shows an error state with retry', async () => {
    mockGoalListError();
    renderManager();

    expect(await screen.findByText("We couldn't load your goals")).toBeInTheDocument();

    mockGoalListResponse([vacationGoal]);
    mockGoalContributionListResponse([]);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Vacation')).toBeInTheDocument();
  });

  it('creates a goal from the dialog', async () => {
    const user = userEvent.setup();
    mockGoalListResponse([]);
    server.use(
      http.post('/api/trpc/goal.create', () => {
        return HttpResponse.json({
          result: { data: { ...vacationGoal, name: 'Vacation' } },
        });
      })
    );
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Add goal' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add goal' });

    await user.type(within(dialog).getByLabelText('Goal name'), 'Vacation');
    await user.type(within(dialog).getByLabelText('Target amount'), '2500.00');
    await user.click(within(dialog).getByRole('button', { name: 'Deadline' }));
    const grid = await screen.findByRole('grid');
    const day = new Date().getDate() === 15 ? '16' : '15';
    await user.click(within(grid).getByText(day));
    await user.click(within(dialog).getByRole('button', { name: 'Add goal' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Add goal' })).not.toBeInTheDocument();
    });
  });

  it('edits a goal from the actions menu', async () => {
    const user = userEvent.setup();
    let updateBody: unknown;
    mockGoalListResponse([vacationGoal]);
    mockGoalContributionListResponse([]);
    server.use(
      http.post('/api/trpc/goal.update', async ({ request }) => {
        updateBody = await request.json();
        return HttpResponse.json({ result: { data: { ...vacationGoal, name: 'Big vacation' } } });
      })
    );
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Actions for Vacation' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit goal' });
    const nameInput = within(dialog).getByLabelText('Goal name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Big vacation');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateBody).not.toBeNull());
    expect(updateBody).toMatchObject({ id: vacationGoal.id, name: 'Big vacation' });
  });

  it('deletes a goal after confirmation', async () => {
    const user = userEvent.setup();
    mockGoalListResponse([vacationGoal]);
    mockGoalContributionListResponse([]);
    mockDeleteGoalResponse();
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Actions for Vacation' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    const dialog = await screen.findByRole('dialog', { name: 'Delete Vacation?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete goal' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete Vacation?' })).not.toBeInTheDocument();
    });
  });

  it('renders a progress bar from the saved amount', async () => {
    mockGoalListResponse([laptopGoal]);
    mockGoalContributionListResponse([]);
    renderManager();

    const progress = await screen.findByRole('progressbar', {
      name: 'Laptop savings progress',
    });
    expect(progress).toHaveAttribute('aria-valuenow', '20');
    expect(screen.getByText(/20%/)).toBeInTheDocument();
  });

  it('shows a completed state when the saved amount reaches the target', async () => {
    mockGoalListResponse([makeGoal({ savedAmount: '1500.00' })]);
    mockGoalContributionListResponse([]);
    renderManager();

    const progress = await screen.findByRole('progressbar', {
      name: 'Emergency fund savings progress',
    });
    expect(progress).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText(/target reached/)).toBeInTheDocument();
  });

  it('shows contributions inline and creates one from an eligible account', async () => {
    const user = userEvent.setup();
    const usdAccount = makeAccount({
      id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      name: 'Savings',
      currency: 'USD',
      unallocatedBalance: '900.00',
    });
    const eurAccount = makeAccount({
      id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
      name: 'Euro checking',
      currency: 'EUR',
      unallocatedBalance: '400.00',
    });
    const creditCard = makeAccount({
      id: 'e5f6a7b8-c9d0-1234-efab-345678901234',
      name: 'Visa',
      currency: 'USD',
      type: 'credit_card',
      unallocatedBalance: '1000.00',
    });
    const contribution = makeGoalContribution({
      goalId: vacationGoal.id,
      accountId: usdAccount.id,
      amount: '100.00',
    });
    mockAccountListResponse([usdAccount, eurAccount, creditCard]);
    mockGoalListResponse([vacationGoal]);
    mockGoalContributionListResponse([contribution]);
    let createBody: unknown;
    server.use(
      http.post('/api/trpc/goalContribution.create', async ({ request }) => {
        createBody = await request.json();
        return HttpResponse.json({ result: { data: contribution } });
      })
    );
    renderManager();

    // Contributions are visible without opening anything first.
    expect(await screen.findByText('Savings')).toBeInTheDocument();
    expect(screen.getByText('Contributions')).toBeInTheDocument();

    // Contribute goes straight to the add form.
    await user.click(screen.getByRole('button', { name: 'Contribute' }));
    const formDialog = await screen.findByRole('dialog', { name: 'Add contribution' });

    // Only the USD asset account is eligible: the EUR account mismatches the
    // Currency and the credit card is debt.
    await user.click(within(formDialog).getByPlaceholderText('Select an account'));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText(/Savings/)).toBeInTheDocument();
    expect(within(listbox).queryByText(/Euro checking/)).not.toBeInTheDocument();
    expect(within(listbox).queryByText(/Visa/)).not.toBeInTheDocument();
    await user.click(within(listbox).getByText(/Savings/));

    await user.type(within(formDialog).getByLabelText('Amount'), '100.00');
    await user.click(within(formDialog).getByRole('button', { name: 'Add contribution' }));

    await waitFor(() => expect(createBody).not.toBeNull());
    expect(createBody).toEqual({
      goalId: vacationGoal.id,
      accountId: usdAccount.id,
      amount: '100.00',
    });
  });

  it('edits a contribution inline', async () => {
    const user = userEvent.setup();
    const usdAccount = makeAccount({ name: 'Savings' });
    const contribution = makeGoalContribution({
      goalId: vacationGoal.id,
      accountId: usdAccount.id,
      amount: '100.00',
    });
    mockAccountListResponse([usdAccount]);
    mockGoalListResponse([vacationGoal]);
    mockGoalContributionListResponse([contribution]);
    let updateBody: unknown;
    server.use(
      http.post('/api/trpc/goalContribution.update', async ({ request }) => {
        updateBody = await request.json();
        return HttpResponse.json({ result: { data: contribution } });
      })
    );
    renderManager();

    await user.click(await screen.findByRole('button', { name: /Actions for contribution of/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit contribution' });
    await user.clear(within(dialog).getByLabelText('Amount'));
    await user.type(within(dialog).getByLabelText('Amount'), '150.00');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateBody).not.toBeNull());
    expect(updateBody).toMatchObject({ id: contribution.id, amount: '150.00' });
  });

  it('surfaces API validation errors when contributing', async () => {
    const user = userEvent.setup();
    const usdAccount = makeAccount({ name: 'Savings', unallocatedBalance: '900.00' });
    mockAccountListResponse([usdAccount]);
    mockGoalListResponse([vacationGoal]);
    mockGoalContributionListResponse([]);
    mockCreateGoalContributionError();
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Contribute' }));
    const formDialog = await screen.findByRole('dialog', { name: 'Add contribution' });
    await user.click(within(formDialog).getByPlaceholderText('Select an account'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText(/Savings/));
    await user.type(within(formDialog).getByLabelText('Amount'), '100.00');
    await user.click(within(formDialog).getByRole('button', { name: 'Add contribution' }));

    expect(
      await screen.findByText('The account does not have enough unallocated balance.')
    ).toBeInTheDocument();
  });

  it('explains when no account can fund a goal', async () => {
    const user = userEvent.setup();
    const eurAccount = makeAccount({ name: 'Euro checking', currency: 'EUR' });
    mockAccountListResponse([eurAccount]);
    mockGoalListResponse([vacationGoal]);
    mockGoalContributionListResponse([]);
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Contribute' }));
    const formDialog = await screen.findByRole('dialog', { name: 'Add contribution' });

    expect(
      within(formDialog).getByText(
        /You need a USD account with an unallocated balance before you can contribute/
      )
    ).toBeInTheDocument();
  });

  it('deletes a contribution after confirmation', async () => {
    const user = userEvent.setup();
    const usdAccount = makeAccount({ name: 'Savings' });
    const contribution = makeGoalContribution({ goalId: vacationGoal.id, amount: '100.00' });
    mockAccountListResponse([usdAccount]);
    mockGoalListResponse([vacationGoal]);
    mockGoalContributionListResponse([contribution]);
    mockDeleteGoalContributionResponse();
    renderManager();

    await user.click(
      await screen.findByRole('button', {
        name: /Actions for contribution of/,
      })
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    const confirmDialog = await screen.findByRole('dialog', {
      name: /Delete the .* contribution\?/,
    });
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete contribution' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /Delete the .* contribution\?/ })
      ).not.toBeInTheDocument();
    });
  });
});
