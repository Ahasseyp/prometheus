import { http, HttpResponse } from 'msw';

import { server } from './server.js';

export type TransactionFixture = {
  id: string;
  householdId: string;
  accountId: string;
  categoryId: string;
  type: string;
  amount: string;
  date: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  accountName: string;
  accountCurrency: string;
  categoryName: string;
};

export function makeTransaction(overrides: Partial<TransactionFixture> = {}): TransactionFixture {
  return {
    id: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
    householdId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    accountId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    categoryId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: 'expense',
    amount: '12.50',
    date: '2026-09-15T00:00:00.000Z',
    description: 'Groceries',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accountName: 'Everyday Checking',
    accountCurrency: 'USD',
    categoryName: 'Groceries',
    ...overrides,
  };
}

export function mockTransactionListResponse(data: unknown) {
  server.use(
    http.get('/api/trpc/transaction.list', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockTransactionListError() {
  server.use(http.get('/api/trpc/transaction.list', () => HttpResponse.error()));
}

export function mockCreateTransactionResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/transaction.create', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockCreateTransactionError(message = 'Something went wrong.') {
  server.use(
    http.post('/api/trpc/transaction.create', () => {
      return HttpResponse.json(
        { error: { message, code: -32600, data: { code: 'BAD_REQUEST', httpStatus: 400 } } },
        { status: 400 }
      );
    })
  );
}
