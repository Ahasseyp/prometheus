import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server } from '@/test/server.js';
import { createQueryClientWrapper } from '@/test/providers.js';

import { GoalForm } from './GoalForm.js';

const createdGoal = {
  id: '11111111-2222-3333-4444-555555555555',
  householdId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  name: 'Vacation',
  target: '2500.00',
  savedAmount: '0.00',
  currency: 'USD',
  deadline: '2027-06-30T00:00:00.000Z',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderForm(props: { onSuccess?: () => void } = {}) {
  return render(<GoalForm onSuccess={props.onSuccess} />, {
    wrapper: createQueryClientWrapper(),
  });
}

async function pickDeadline(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Deadline' }));
  const grid = await screen.findByRole('grid');
  // Mid-month days never render as adjacent-month outside days.
  const day = new Date().getDate() === 15 ? '16' : '15';
  await user.click(within(grid).getByText(day));
}

function mockCreateGoalCapture(
  responder: (body: unknown) => Parameters<typeof HttpResponse.json>[0]
) {
  let requestBody: unknown;
  server.use(
    http.post('/api/trpc/goal.create', async ({ request }) => {
      requestBody = await request.json();
      return HttpResponse.json(responder(requestBody));
    })
  );
  return () => requestBody;
}

describe('GoalForm', () => {
  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Add goal' }));

    expect(await screen.findByText('Enter a goal name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a positive amount.')).toBeInTheDocument();
    expect(screen.getByText('Select a deadline.')).toBeInTheDocument();
  });

  it('creates a goal with the entered values', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const getRequestBody = mockCreateGoalCapture(() => ({ result: { data: createdGoal } }));
    renderForm({ onSuccess });

    await user.type(screen.getByLabelText('Goal name'), 'Vacation');
    await user.type(screen.getByLabelText('Target amount'), '2500.00');
    await pickDeadline(user);
    await user.click(screen.getByRole('button', { name: 'Add goal' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const day = new Date().getDate() === 15 ? '16' : '15';
    expect(getRequestBody()).toEqual({
      name: 'Vacation',
      target: '2500.00',
      currency: 'USD',
      deadline: expect.stringMatching(new RegExp(`-${day}T`)),
    });
  });

  it('surfaces mutation errors', async () => {
    const user = userEvent.setup();
    mockCreateGoalCapture(() => ({
      error: {
        message: 'The goal data is invalid.',
        code: -32600,
        data: { code: 'BAD_REQUEST', httpStatus: 400 },
      },
    }));
    const onSuccess = vi.fn();
    renderForm({ onSuccess });

    await user.type(screen.getByLabelText('Goal name'), 'Vacation');
    await user.type(screen.getByLabelText('Target amount'), '2500.00');
    await pickDeadline(user);
    await user.click(screen.getByRole('button', { name: 'Add goal' }));

    expect(await screen.findByText('The goal data is invalid.')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
