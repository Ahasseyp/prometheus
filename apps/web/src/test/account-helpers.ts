import { http, HttpResponse } from 'msw';

import { server } from './server.js';

export type AccountFixture = {
  id: string;
  householdId: string;
  name: string;
  type: string;
  currency: string;
  balance: string;
  createdAt: string;
  updatedAt: string;
};

export function makeAccount(overrides: Partial<AccountFixture> = {}): AccountFixture {
  return {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    householdId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    name: 'Account',
    type: 'checking',
    currency: 'USD',
    balance: '0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockAccountListResponse(data: unknown) {
  server.use(
    http.get('/api/trpc/account.list', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockAccountListError() {
  server.use(http.get('/api/trpc/account.list', () => HttpResponse.error()));
}

export function mockCreateAccountResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/account.create', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockCreateAccountError(message = 'Something went wrong.') {
  server.use(
    http.post('/api/trpc/account.create', () => {
      return HttpResponse.json(
        { error: { message, code: -32600, data: { code: 'BAD_REQUEST', httpStatus: 400 } } },
        { status: 400 }
      );
    })
  );
}

export function mockDeleteAccountResponse(data: unknown = { ok: true }) {
  server.use(
    http.post('/api/trpc/account.delete', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockAccountListResponseThenEmptyAfterDelete(initialData: unknown) {
  let data = initialData;
  server.use(
    http.get('/api/trpc/account.list', () => HttpResponse.json({ result: { data } })),
    http.post('/api/trpc/account.delete', () => {
      data = [];
      return HttpResponse.json({ result: { data: { ok: true } } });
    })
  );
}
