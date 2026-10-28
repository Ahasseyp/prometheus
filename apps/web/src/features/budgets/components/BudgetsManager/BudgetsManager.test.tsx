import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeCategory, mockCategoryListResponse } from '@/test/category-helpers.js';
import {
  makeBudget,
  makeBudgetProgress,
  mockBudgetListError,
  mockBudgetListResponse,
  mockBudgetProgressError,
  mockBudgetProgressResponse,
  mockCreateBudgetError,
  mockCreateBudgetResponse,
  mockDeleteBudgetResponse,
  mockUpdateBudgetResponse,
} from '@/test/budget-helpers.js';
import { mockHouseholdMeResponse } from '@/test/household-helpers.js';
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
    mockHouseholdMeResponse({
      household: {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        name: 'Home',
        reportingCurrency: 'USD',
        role: 'OWNER',
      },
    });
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

  it('creates a budget from the form payload', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(window, 'fetch');
    mockCategoryListResponse([groceries, dining]);
    mockBudgetListResponse([]);
    mockCreateBudgetResponse(makeBudget());
    renderManager();

    await user.click(screen.getByRole('button', { name: 'Add budget' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add budget' });

    await user.type(within(dialog).getByLabelText('Amount'), '500.00');
    await user.click(within(dialog).getByRole('button', { name: 'Monthly' }));
    await user.click(within(dialog).getByRole('combobox', { name: 'Categories' }));
    await user.click(await screen.findByRole('option', { name: 'Groceries' }));
    await user.click(await screen.findByRole('option', { name: 'Dining out' }));
    await user.keyboard('{Escape}');
    await user.click(within(dialog).getByRole('button', { name: 'Add budget' }));

    await vi.waitFor(() => {
      const createCall = fetchSpy.mock.calls.find(
        ([url, init]) => String(url).includes('budget.create') && init?.method === 'POST'
      );
      expect(createCall).toBeDefined();
      expect(JSON.parse(String(createCall![1]?.body))).toEqual({
        limit: '500.00',
        period: 'monthly',
        categoryIds: [groceries.id, dining.id],
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Add budget' })).not.toBeInTheDocument();
    });
    fetchSpy.mockRestore();
  });

  it('edits a budget from the row actions', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(window, 'fetch');
    const namedBudget = makeBudget({ name: 'Monthly spending', categoryIds: [groceries.id] });
    mockCategoryListResponse([groceries, dining]);
    mockBudgetListResponse([namedBudget]);
    mockBudgetProgressResponse(makeBudgetProgress({ id: namedBudget.id, name: namedBudget.name }));
    mockUpdateBudgetResponse(namedBudget);
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Actions for Monthly spending' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit budget' });

    expect(within(dialog).getByLabelText('Amount')).toHaveValue('500.00');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await vi.waitFor(() => {
      const updateCall = fetchSpy.mock.calls.find(
        ([url, init]) => String(url).includes('budget.update') && init?.method === 'POST'
      );
      expect(updateCall).toBeDefined();
      expect(JSON.parse(String(updateCall![1]?.body))).toEqual({
        id: namedBudget.id,
        limit: '500.00',
        period: 'monthly',
        categoryIds: [groceries.id],
      });
    });
    fetchSpy.mockRestore();
  });

  it('deletes a budget after confirmation', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(window, 'fetch');
    const namedBudget = makeBudget({ name: 'Monthly spending', categoryIds: [groceries.id] });
    mockCategoryListResponse([groceries]);
    mockBudgetListResponse([namedBudget]);
    mockBudgetProgressResponse(makeBudgetProgress({ id: namedBudget.id, name: namedBudget.name }));
    mockDeleteBudgetResponse();
    renderManager();

    await user.click(await screen.findByRole('button', { name: 'Actions for Monthly spending' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Monthly spending?' });

    await user.click(within(dialog).getByRole('button', { name: 'Delete budget' }));

    await vi.waitFor(() => {
      const deleteCall = fetchSpy.mock.calls.find(
        ([url, init]) => String(url).includes('budget.delete') && init?.method === 'POST'
      );
      expect(deleteCall).toBeDefined();
      expect(JSON.parse(String(deleteCall![1]?.body))).toEqual({ id: namedBudget.id });
    });
    fetchSpy.mockRestore();
  });

  it('shows a domain-specific mutation error', async () => {
    const user = userEvent.setup();
    mockCategoryListResponse([groceries]);
    mockBudgetListResponse([]);
    mockCreateBudgetError('Budgets can only track expense categories.');
    renderManager();

    await user.click(screen.getByRole('button', { name: 'Add budget' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add budget' });

    await user.type(within(dialog).getByLabelText('Amount'), '500.00');
    await user.click(within(dialog).getByRole('combobox', { name: 'Categories' }));
    await user.click(await screen.findByRole('option', { name: 'Groceries' }));
    await user.keyboard('{Escape}');
    await user.click(within(dialog).getByRole('button', { name: 'Add budget' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Budgets can only track expense categories.'
    );
  });
});
