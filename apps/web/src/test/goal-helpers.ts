import { http, HttpResponse } from 'msw';

import { server } from './server.js';

export type GoalFixture = {
  id: string;
  householdId: string;
  name: string;
  target: string;
  savedAmount: string;
  currency: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
};

export function makeGoal(overrides: Partial<GoalFixture> = {}): GoalFixture {
  return {
    id: 'e5f6a7b8-c9d0-1234-abcd-345678901234',
    householdId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    name: 'Emergency fund',
    target: '1000.00',
    savedAmount: '0.00',
    currency: 'USD',
    deadline: '2027-06-30T00:00:00.000Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockGoalListResponse(data: unknown) {
  server.use(
    http.get('/api/trpc/goal.list', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockGoalListError() {
  server.use(http.get('/api/trpc/goal.list', () => HttpResponse.error()));
}

export function mockCreateGoalResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/goal.create', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockCreateGoalError(message = 'Something went wrong.') {
  server.use(
    http.post('/api/trpc/goal.create', () => {
      return HttpResponse.json(
        { error: { message, code: -32600, data: { code: 'BAD_REQUEST', httpStatus: 400 } } },
        { status: 400 }
      );
    })
  );
}

export function mockUpdateGoalResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/goal.update', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockDeleteGoalResponse(data: unknown = { ok: true }) {
  server.use(
    http.post('/api/trpc/goal.delete', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export type GoalContributionFixture = {
  id: string;
  householdId: string;
  goalId: string;
  accountId: string;
  amount: string;
  createdAt: string;
  updatedAt: string;
};

export function makeGoalContribution(
  overrides: Partial<GoalContributionFixture> = {}
): GoalContributionFixture {
  return {
    id: 'a7b8c9d0-e1f2-3456-cdef-567890123456',
    householdId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    goalId: 'e5f6a7b8-c9d0-1234-abcd-345678901234',
    accountId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    amount: '100.00',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockGoalContributionListResponse(data: unknown) {
  server.use(
    http.get('/api/trpc/goalContribution.list', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockCreateGoalContributionError(
  message = 'The account does not have enough unallocated balance.'
) {
  server.use(
    http.post('/api/trpc/goalContribution.create', () => {
      return HttpResponse.json(
        { error: { message, code: -32600, data: { code: 'BAD_REQUEST', httpStatus: 400 } } },
        { status: 400 }
      );
    })
  );
}

export function mockDeleteGoalContributionResponse(data: unknown = { ok: true }) {
  server.use(
    http.post('/api/trpc/goalContribution.delete', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}
