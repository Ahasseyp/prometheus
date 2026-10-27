import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeCategory, mockCategoryListResponse } from '@/test/category-helpers.js';
import { createQueryClientWrapper } from '@/test/providers.js';

import { CategoriesManager } from './CategoriesManager.js';

function createMatchMedia(matches: boolean) {
  return (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

const groceries = makeCategory({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Groceries' });
const salary = makeCategory({
  id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  name: 'Salary',
  type: 'income',
});

function renderManager() {
  return render(<CategoriesManager />, { wrapper: createQueryClientWrapper() });
}

describe('CategoriesManager', () => {
  beforeEach(() => {
    window.matchMedia = createMatchMedia(false);
  });

  it('shows only expense categories on the Expenses tab by default', async () => {
    mockCategoryListResponse([groceries, salary]);
    renderManager();

    expect(await screen.findByText('Groceries')).toBeInTheDocument();
    expect(screen.queryByText('Salary')).not.toBeInTheDocument();
  });

  it('switches to income categories on the Income tab', async () => {
    const user = userEvent.setup();
    mockCategoryListResponse([groceries, salary]);
    renderManager();

    await user.click(await screen.findByRole('tab', { name: 'Income' }));

    await waitFor(() => {
      expect(screen.getByText('Salary')).toBeInTheDocument();
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
    });
  });
});
