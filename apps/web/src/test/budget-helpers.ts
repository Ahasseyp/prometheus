import { http, HttpResponse } from 'msw';

import { server } from './server.js';

export type BudgetFixture = {
  id: string;
  householdId: string;
  name: string;
  limit: string;
  period: 'weekly' | 'monthly' | 'yearly';
  categoryIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type BudgetProgressFixture = {
  id: string;
  name: string;
  currency: string;
  period: {
    start: string;
    end: string;
  };
  limit: string;
  rollover: string;
  available: string;
  spent: string;
  remaining: string;
};

export function makeBudget(overrides: Partial<BudgetFixture> = {}): BudgetFixture {
  return {
    id: 'e5f6a7b8-c9d0-1234-abcd-345678901234',
    householdId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    name: 'Monthly spending',
    limit: '500.00',
    period: 'monthly',
    categoryIds: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeBudgetProgress(
  overrides: Partial<BudgetProgressFixture> = {}
): BudgetProgressFixture {
  return {
    id: 'e5f6a7b8-c9d0-1234-abcd-345678901234',
    name: 'Monthly spending',
    currency: 'USD',
    period: {
      start: '2026-10-01T00:00:00.000Z',
      end: '2026-11-01T00:00:00.000Z',
    },
    limit: '500.00',
    rollover: '25.00',
    available: '525.00',
    spent: '450.00',
    remaining: '75.00',
    ...overrides,
  };
}

export function mockBudgetListResponse(data: unknown) {
  server.use(
    http.get('/api/trpc/budget.list', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockBudgetListError() {
  server.use(http.get('/api/trpc/budget.list', () => HttpResponse.error()));
}

export function mockBudgetProgressResponse(data: unknown) {
  server.use(
    http.get('/api/trpc/budget.progress', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockBudgetProgressError() {
  server.use(http.get('/api/trpc/budget.progress', () => HttpResponse.error()));
}
