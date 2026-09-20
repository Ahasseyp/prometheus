import { http, HttpResponse } from 'msw';

import { server } from './server.js';

export type CategoryFixture = {
  id: string;
  householdId: string;
  name: string;
  type: string;
  isSystem: boolean;
  parentId: string | null;
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
