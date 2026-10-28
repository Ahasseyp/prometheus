import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeCategory, mockCategoryListResponse } from '@/test/category-helpers.js';
import {
  makeBudget,
  makeBudgetProgress,
  mockBudgetListError,
  mockBudgetListResponse,
  mockBudgetProgressError,
  mockBudgetProgressResponse,
} from '@/test/budget-helpers.js';
import { createQueryClientWrapper } from '@/test/providers.js';

import { BudgetsManager } from './BudgetsManager.js';

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

const groceries = makeCategory({
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  name: 'Groceries',
});

const dining = makeCategory({
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  name: 'Dining out',
});

const groceriesBudget = makeBudget({
  id: 'e5f6a7b8-c9d0-1234-abcd-345678901234',
  name: '',
  limit: '500.00',
  categoryIds: [groceries.id, dining.id],
});

const groceriesProgress = makeBudgetProgress({
  id: groceriesBudget.id,
  name: '',
  currency: 'USD',
  limit: '500.00',
  rollover: '25.00',
  available: '525.00',
  spent: '450.00',
  remaining: '75.00',
});

function renderManager() {
  return render(<BudgetsManager />, { wrapper: createQueryClientWrapper() });
}

describe('BudgetsManager', () => {
  beforeEach(() => {
    window.matchMedia = createMatchMedia(false);
    window.innerWidth = 1024;
  });

  it('renders budgets with category names and current-period progress', async () => {
    mockCategoryListResponse([groceries, dining]);
    mockBudgetListResponse([groceriesBudget]);
    mockBudgetProgressResponse(groceriesProgress);
    renderManager();

    expect(await screen.findByText('Groceries, Dining out')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText(/450\.00/)).toBeInTheDocument();
    expect(screen.getByText(/525\.00/)).toBeInTheDocument();
    expect(screen.getByText(/75\.00/)).toBeInTheDocument();
    expect(screen.getAllByText(/25\.00/).length).toBeGreaterThan(0);
  });

  it('renders an over-budget state when remaining is negative', async () => {
    mockCategoryListResponse([groceries]);
    mockBudgetListResponse([groceriesBudget]);
    mockBudgetProgressResponse(
      makeBudgetProgress({
        id: groceriesBudget.id,
        spent: '550.00',
        remaining: '-25.00',
      })
    );
    renderManager();

    expect(await screen.findByText('Over budget')).toBeInTheDocument();
    expect(screen.getByText(/^Over by /)).toBeInTheDocument();
    expect(screen.getAllByText(/25\.00/).length).toBeGreaterThan(0);
  });

  it('renders a retryable error when the budget list fails', async () => {
    mockCategoryListResponse([groceries]);
    mockBudgetListError();
    renderManager();

    expect(await screen.findByText("We couldn't load your budgets")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('renders an empty state when the household has no budgets', async () => {
    mockCategoryListResponse([groceries]);
    mockBudgetListResponse([]);
    renderManager();

    expect(await screen.findByText('No budgets yet')).toBeInTheDocument();
  });

  it('renders a retryable error when budget progress fails', async () => {
    mockCategoryListResponse([groceries, dining]);
    mockBudgetListResponse([groceriesBudget]);
    mockBudgetProgressError();
    renderManager();

    expect(await screen.findByText("We couldn't load this budget's progress")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('renders budget cards on mobile', async () => {
    window.matchMedia = createMatchMedia(true);
    window.innerWidth = 500;
    mockCategoryListResponse([groceries, dining]);
    mockBudgetListResponse([groceriesBudget]);
    mockBudgetProgressResponse(groceriesProgress);
    renderManager();

    expect(await screen.findByText('Groceries, Dining out')).toBeInTheDocument();
    expect(screen.getByText('Spent')).toBeInTheDocument();
    window.innerWidth = 1024;
  });
});
