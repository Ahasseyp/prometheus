import { http, HttpResponse } from 'msw';

import { server } from './server.js';

export type CategoryFixture = {
  id: string;
  householdId: string;
  name: string;
  type: 'expense' | 'income';
  isSystem: boolean;
  parentId: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
};

export function makeCategory(overrides: Partial<CategoryFixture> = {}): CategoryFixture {
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    householdId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    name: 'Groceries',
    type: 'expense',
    isSystem: true,
    parentId: null,
    icon: 'shopping-cart',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockCategoryListResponse(data: unknown) {
  server.use(
    http.get('/api/trpc/category.list', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockCreateCategoryResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/category.create', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockCreateCategoryError(message = 'Something went wrong.') {
  server.use(
    http.post('/api/trpc/category.create', () => {
      return HttpResponse.json(
        { error: { message, code: -32600, data: { code: 'BAD_REQUEST', httpStatus: 400 } } },
        { status: 400 }
      );
    })
  );
}

export function mockUpdateCategoryResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/category.update', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}
