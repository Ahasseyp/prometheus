import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server } from '@/test/server.js';
import { mockMatchMedia } from '@/test/match-media.js';
import {
  makeGoal,
  mockDeleteGoalResponse,
  mockGoalListError,
  mockGoalListResponse,
} from '@/test/goal-helpers.js';
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
    renderManager();

    expect(await screen.findByText('Vacation')).toBeInTheDocument();
    expect(screen.getByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText(/0\.00.*of.*2,500\.00.*saved/)).toBeInTheDocument();
    expect(screen.getByText(/300\.00.*of.*1,500\.00.*saved/)).toBeInTheDocument();
    // Deadlines render in the local timezone, so the day can shift for UTC
    // midnight fixtures.
    expect(screen.getByText(/Jun (29|30), 2027/)).toBeInTheDocument();
    expect(screen.getByText(/Jan (14|15), 2027/)).toBeInTheDocument();
    expect(screen.getAllByText('USD')).toHaveLength(2);
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
});
