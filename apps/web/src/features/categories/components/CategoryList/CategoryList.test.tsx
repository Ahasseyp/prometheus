import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeCategory } from '@/test/category-helpers.js';
import { createQueryClientWrapper } from '@/test/providers.js';

import type { Category } from '../../gateways/categories.js';
import { CategoryList } from './CategoryList.js';

const groceries = makeCategory({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Groceries' });
const diningOut = makeCategory({
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  name: 'Dining out',
  isSystem: false,
  parentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
});
const salary = makeCategory({
  id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  name: 'Salary',
  type: 'income',
});

function renderList() {
  return render(
    <CategoryList
      isLoading={false}
      isError={false}
      onRetry={() => {}}
      onRename={() => {}}
      onDelete={() => {}}
      categories={[groceries, diningOut, salary] as Category[]}
    />,
    { wrapper: createQueryClientWrapper() }
  );
}

describe('CategoryList', () => {
  it('shows a skeleton while loading', () => {
    render(
      <CategoryList
        isLoading
        isError={false}
        onRetry={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />,
      { wrapper: createQueryClientWrapper() }
    );
    expect(screen.getByLabelText('Loading categories')).toBeInTheDocument();
  });

  it('shows an error alert when loading fails', () => {
    render(
      <CategoryList
        isLoading={false}
        isError
        onRetry={vi.fn()}
        onRename={() => {}}
        onDelete={() => {}}
      />,
      { wrapper: createQueryClientWrapper() }
    );
    expect(screen.getByText("We couldn't load your categories")).toBeInTheDocument();
  });

  it('shows an empty state when there are no categories', () => {
    render(
      <CategoryList
        isLoading={false}
        isError={false}
        onRetry={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
        categories={[]}
      />,
      { wrapper: createQueryClientWrapper() }
    );
    expect(screen.getByText('No categories yet')).toBeInTheDocument();
  });

  it('renders parents and indented subcategories in a flat list', () => {
    renderList();

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Dining out')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
  });

  it('marks custom categories with a badge', () => {
    renderList();

    expect(screen.getByText('Custom')).toBeInTheDocument();
  });
});
