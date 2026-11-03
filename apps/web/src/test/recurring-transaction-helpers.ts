import { http, HttpResponse } from 'msw';

import { server } from './server.js';

export type RecurringTransactionFixture = {
  id: string;
  householdId: string;
  accountId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: string;
  startDate: string;
  period: 'week' | 'month' | 'year';
  interval: number;
  nextDate: string;
  description: string;
  accountName: string;
  accountCurrency: string;
  categoryName: string;
  createdAt: string;
  updatedAt: string;
};

export function makeRecurringTransaction(
  overrides: Partial<RecurringTransactionFixture> = {}
): RecurringTransactionFixture {
  return {
    id: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
    householdId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    accountId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    categoryId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: 'expense',
    amount: '42.50',
    startDate: '2026-01-01T00:00:00.000Z',
    period: 'month',
    interval: 1,
    nextDate: '2026-11-01T00:00:00.000Z',
    description: 'Rent',
    accountName: 'Everyday Checking',
    accountCurrency: 'USD',
    categoryName: 'Rent',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockRecurringTransactionListResponse(data: unknown) {
  server.use(
    http.get('/api/trpc/recurringTransaction.list', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockRecurringTransactionListError() {
  server.use(http.get('/api/trpc/recurringTransaction.list', () => HttpResponse.error()));
}

export function mockCreateRecurringTransactionResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/recurringTransaction.create', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockCreateRecurringTransactionError(message = 'Something went wrong.') {
  server.use(
    http.post('/api/trpc/recurringTransaction.create', () => {
      return HttpResponse.json(
        { error: { message, code: -32600, data: { code: 'BAD_REQUEST', httpStatus: 400 } } },
        { status: 400 }
      );
    })
  );
}

export function mockSkipRecurringTransactionResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/recurringTransaction.skip', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}
