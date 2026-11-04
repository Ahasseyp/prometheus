import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';

import { PresetProvider } from '@/components/preset-provider.js';
import { ThemeProvider } from '@/components/theme-provider.js';
import { TooltipProvider } from '@/components/ui/tooltip.js';
import { AccountsPage } from '@/pages/accounts.js';
import { BudgetsPage } from '@/pages/budgets.js';
import { GoalsPage } from '@/pages/goals.js';
import { OverviewPage } from '@/pages/overview.js';
import { TransactionsPage } from '@/pages/transactions.js';
import { CategoriesPage } from '@/pages/categories.js';
import { createQueryClientWrapper } from '@/test/providers.js';
import { server } from '@/test/server.js';
import { mockMeResponse } from '@/test/login-helpers.js';
import { mockCreateHouseholdResponse, mockHouseholdMeResponse } from '@/test/household-helpers.js';
import { mockAccountListResponse } from '@/test/account-helpers.js';
import { mockBudgetListResponse } from '@/test/budget-helpers.js';
import { makeCategory, mockCategoryListResponse } from '@/test/category-helpers.js';
import { mockReportingSummaryResponse } from '@/test/reporting-helpers.js';
import { mockAssistantSubmitCommandResponse } from '@/test/assistant-helpers.js';
import {
  makeTransaction,
  mockCreateTransactionError,
  mockCreateTransactionResponse,
} from '@/test/transaction-helpers.js';

import { AuthenticatedLayout } from './AuthenticatedLayout.js';

const mockUser = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: 'user@example.com',
  name: 'Alex User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockHousehold = {
  household: {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    name: 'My Household',
    reportingCurrency: 'USD',
    role: 'OWNER',
  },
};

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

type RenderAuthenticatedLayoutOptions = {
  initialEntries?: string[];
  user?: unknown;
  householdResponse?: unknown;
};

async function renderAuthenticatedLayout(options: RenderAuthenticatedLayoutOptions = {}) {
  const { initialEntries = ['/'], user = mockUser, householdResponse = mockHousehold } = options;

  mockMeResponse(user);
  mockHouseholdMeResponse(householdResponse);
  mockAccountListResponse([]);
  mockBudgetListResponse([]);
  mockReportingSummaryResponse({ reportingCurrency: 'USD', netWorth: '0', accounts: [] });

  const history = createMemoryHistory({ initialEntries });

  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });

  const authenticatedRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'authenticated',
    component: AuthenticatedLayout,
  });

  const indexRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: '/',
    component: OverviewPage,
    staticData: { title: 'Overview' },
  });

  const accountsRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: '/accounts',
    component: AccountsPage,
    staticData: { title: 'Accounts' },
  });

  const transactionsRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: '/transactions',
    component: TransactionsPage,
    staticData: { title: 'Transactions' },
  });

  const categoriesRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: '/categories',
    component: CategoriesPage,
    staticData: { title: 'Categories' },
  });

  const budgetsRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: '/budgets',
    component: BudgetsPage,
    staticData: { title: 'Budgets' },
  });

  const goalsRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: '/goals',
    component: GoalsPage,
    staticData: { title: 'Goals' },
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([
      authenticatedRoute.addChildren([
        indexRoute,
        accountsRoute,
        transactionsRoute,
        categoriesRoute,
        budgetsRoute,
        goalsRoute,
      ]),
    ]),
    history,
  });

  await router.load();

  const QueryClientWrapper = createQueryClientWrapper();

  const result = render(
    <QueryClientWrapper>
      <PresetProvider>
        <ThemeProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </ThemeProvider>
      </PresetProvider>
    </QueryClientWrapper>
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return { ...result, router };
}

describe('AuthenticatedLayout', () => {
  beforeEach(() => {
    window.matchMedia = createMatchMedia(false);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the authenticated shell around the current page', async () => {
    await renderAuthenticatedLayout({ initialEntries: ['/'] });

    await waitFor(() => {
      expect(
        screen.getAllByRole('heading', { level: 1, name: /overview/i }).length
      ).toBeGreaterThan(0);
    });

    expect(screen.getByText('My Household')).toBeInTheDocument();
    expect(screen.getByText(/ask or do anything/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/main navigation/i)).toBeInTheDocument();
  });

  it('marks the current page as active in the desktop sidebar', async () => {
    await renderAuthenticatedLayout({ initialEntries: ['/transactions'] });

    await waitFor(() => {
      expect(
        screen.getAllByRole('heading', { level: 1, name: /transactions/i }).length
      ).toBeGreaterThan(0);
    });

    const activeButton = screen.getByRole('button', { name: /transactions/i });
    expect(activeButton).toHaveAttribute('aria-current', 'page');
  });

  it('marks the current page as active in the mobile tab bar', async () => {
    window.matchMedia = createMatchMedia(true);
    await renderAuthenticatedLayout({ initialEntries: ['/budgets'] });

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 1, name: /budgets/i }).length).toBeGreaterThan(
        0
      );
    });

    const activeLink = screen.getByRole('link', { name: /budgets/i });
    expect(activeLink).toHaveAttribute('aria-current', 'page');
  });

  it('renders the categories page from the sidebar navigation', async () => {
    mockCategoryListResponse([makeCategory({ name: 'Groceries' })]);
    await renderAuthenticatedLayout({ initialEntries: ['/categories'] });

    await waitFor(() => {
      expect(
        screen.getAllByRole('heading', { level: 1, name: /categories/i }).length
      ).toBeGreaterThan(0);
    });

    expect(await screen.findByText('Groceries')).toBeInTheDocument();
  });

  it('opens the assistant dialog from the header button and closes with Escape', async () => {
    await renderAuthenticatedLayout({ initialEntries: ['/'] });
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await user.click(screen.getByText(/ask or do anything/i));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('opens the assistant dialog with Command+K and closes with Escape', async () => {
    await renderAuthenticatedLayout({ initialEntries: ['/'] });
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await user.keyboard('{Meta>}k{/Meta}');

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('opens the add-transaction dialog from the assistant', async () => {
    await renderAuthenticatedLayout({ initialEntries: ['/'] });
    const user = userEvent.setup();

    await user.keyboard('{Meta>}k{/Meta}');

    await user.click(await screen.findByText('Add a transaction'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add transaction' })).toBeInTheDocument();
    });
  });

  it('opens the assistant sheet with the submitted command when free-form text is entered', async () => {
    mockAssistantSubmitCommandResponse({
      kind: 'add-transaction',
      type: 'expense',
      amount: '300',
      currency: 'MXN',
      accountName: 'Checking',
      categoryName: 'Groceries',
      description: 'Groceries',
      date: new Date().toISOString(),
    });

    await renderAuthenticatedLayout({ initialEntries: ['/'] });
    const user = userEvent.setup();

    await user.keyboard('{Meta>}k{/Meta}');

    const input = await screen.findByPlaceholderText(/add, ask, check, do/i);
    await user.type(input, 'spent 300 pesos on groceries');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('assistant-command-card')).toBeInTheDocument();
    });

    // The palette dialog closes; the chat lives in the sheet.
    expect(screen.queryByPlaceholderText(/add, ask, check, do/i)).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Assistant' })).toBeInTheDocument();
    expect(screen.getByText('spent 300 pesos on groceries')).toBeInTheDocument();
    expect(screen.getByText('Expense')).toBeInTheDocument();
    expect(screen.getByText(/300 MXN/i)).toBeInTheDocument();
  });

  it('closes the assistant sheet with Escape and resets the thread', async () => {
    mockAssistantSubmitCommandResponse({
      kind: 'needs-clarification',
      understood: 'I understood you spent 300 MXN.',
      missing: ['category'],
      question: 'Which category did you mean?',
    });

    await renderAuthenticatedLayout({ initialEntries: ['/'] });
    const user = userEvent.setup();

    await user.keyboard('{Meta>}k{/Meta}');

    const input = await screen.findByPlaceholderText(/add, ask, check, do/i);
    await user.type(input, 'spent 300 pesos on subscriptions');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText(/Need a bit more detail/i)).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Reopening the palette shows a fresh palette; the sheet state was reset.
    await user.keyboard('{Meta>}k{/Meta}');

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add, ask, check, do/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Need a bit more detail/i)).not.toBeInTheDocument();
    expect(screen.getByText('Add a transaction')).toBeInTheDocument();
  });

  it('creates the transaction when the assistant card is confirmed', async () => {
    mockAssistantSubmitCommandResponse({
      kind: 'add-transaction',
      type: 'expense',
      amount: '300',
      currency: 'MXN',
      accountId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      accountName: 'Everyday Checking',
      categoryId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      categoryName: 'Groceries',
      description: 'Groceries',
      date: new Date().toISOString(),
    });
    mockCreateTransactionResponse(makeTransaction({ amount: '300', description: 'Groceries' }));

    await renderAuthenticatedLayout({ initialEntries: ['/'] });
    const user = userEvent.setup();

    await user.keyboard('{Meta>}k{/Meta}');

    const input = await screen.findByPlaceholderText(/add, ask, check, do/i);
    await user.type(input, 'spent 300 pesos on groceries');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('assistant-command-card')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('assistant-confirm-button'));

    await waitFor(() => {
      expect(screen.getByTestId('assistant-created-card')).toBeInTheDocument();
    });
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText(/300 USD/i)).toBeInTheDocument();
  });

  it('maps a creation error to an assistant message instead of a toast', async () => {
    mockAssistantSubmitCommandResponse({
      kind: 'add-transaction',
      type: 'expense',
      amount: '300',
      currency: 'MXN',
      accountId: 'c3d4e5f6-a7b8-9012-cdef-1234567890',
      accountName: 'Checking',
      categoryId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      categoryName: 'Groceries',
      description: 'Groceries',
      date: new Date().toISOString(),
    });
    mockCreateTransactionError('This transaction would overpay the loan.');

    await renderAuthenticatedLayout({ initialEntries: ['/'] });
    const user = userEvent.setup();

    await user.keyboard('{Meta>}k{/Meta}');

    const input = await screen.findByPlaceholderText(/add, ask, check, do/i);
    await user.type(input, 'paid 300 on my loan');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('assistant-command-card')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('assistant-confirm-button'));

    await waitFor(() => {
      expect(screen.getByText('This transaction would overpay the loan.')).toBeInTheDocument();
    });
  });

  it('replaces the card with a note when the command is denied', async () => {
    mockAssistantSubmitCommandResponse({
      kind: 'add-transaction',
      type: 'expense',
      amount: '300',
      currency: 'MXN',
      accountId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      accountName: 'Everyday Checking',
      categoryId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      categoryName: 'Groceries',
      description: 'Groceries',
      date: new Date().toISOString(),
    });

    await renderAuthenticatedLayout({ initialEntries: ['/'] });
    const user = userEvent.setup();

    await user.keyboard('{Meta>}k{/Meta}');

    const input = await screen.findByPlaceholderText(/add, ask, check, do/i);
    await user.type(input, 'spent 300 pesos on groceries');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('assistant-command-card')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Deny' }));

    await waitFor(() => {
      expect(screen.queryByTestId('assistant-command-card')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Cancelled.')).toBeInTheDocument();
  });

  it('opens the transaction form pre-filled from the assistant card', async () => {
    mockAssistantSubmitCommandResponse({
      kind: 'add-transaction',
      type: 'expense',
      amount: '300',
      currency: 'MXN',
      accountId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      accountName: 'Everyday Checking',
      categoryId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      categoryName: 'Groceries',
      description: 'Groceries',
      date: new Date().toISOString(),
    });

    await renderAuthenticatedLayout({ initialEntries: ['/'] });
    const user = userEvent.setup();

    await user.keyboard('{Meta>}k{/Meta}');

    const input = await screen.findByPlaceholderText(/add, ask, check, do/i);
    await user.type(input, 'spent 300 pesos on groceries');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('assistant-command-card')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Edit in form' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Add transaction' })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Amount')).toHaveValue('300');
    expect(screen.getByLabelText('Description')).toHaveValue('Groceries');
    // A command without an explicit date defaults to today, in local time.
    expect(screen.getByRole('button', { name: 'Transaction date' })).toHaveTextContent(
      format(new Date(), 'PPP')
    );
  });

  it('sends follow-up replies in the assistant sheet', async () => {
    mockAssistantSubmitCommandResponse({
      kind: 'add-transaction',
      type: 'expense',
      amount: '300',
      currency: 'MXN',
      accountName: 'Checking',
      categoryName: 'Groceries',
      description: 'Groceries',
      date: new Date().toISOString(),
    });

    await renderAuthenticatedLayout({ initialEntries: ['/'] });
    const user = userEvent.setup();

    await user.keyboard('{Meta>}k{/Meta}');

    const input = await screen.findByPlaceholderText(/add, ask, check, do/i);
    await user.type(input, 'spent 300 pesos on groceries');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('assistant-command-card')).toBeInTheDocument();
    });

    const composer = screen.getByTestId('assistant-chat-input');
    await user.type(composer, 'actually make that 400');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('actually make that 400')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('assistant-command-card')).toHaveLength(2);
  });

  it('renders the household creation card inline when the user has no household', async () => {
    const { router } = await renderAuthenticatedLayout({
      initialEntries: ['/'],
      householdResponse: { household: null },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create your household/i })).toBeInTheDocument();
    });

    expect(router.state.location.pathname).toBe('/');
  });

  it('unlocks the dashboard after the user creates a household', async () => {
    const user = userEvent.setup();
    const createdHousehold = {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      name: 'Home',
      reportingCurrency: 'USD',
      role: 'OWNER',
    };

    mockCreateHouseholdResponse({
      ok: true,
      household: createdHousehold,
    });

    await renderAuthenticatedLayout({
      initialEntries: ['/'],
      householdResponse: { household: null },
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/household name/i)).toBeInTheDocument();
    });

    // After the form is submitted the `household.me` query is invalidated.
    // Replace the static null handler with one that returns the new household
    // so the layout unlocks the dashboard.
    server.use(
      http.get('/api/trpc/household.me', () => {
        return HttpResponse.json({
          result: {
            data: {
              household: createdHousehold,
            },
          },
        });
      })
    );

    await user.type(screen.getByLabelText(/household name/i), 'Home');
    await user.click(screen.getByRole('combobox', { name: /reporting currency/i }));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /us dollar \(USD\)/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('option', { name: /us dollar \(USD\)/i }));
    await user.click(screen.getByRole('button', { name: /create household/i }));

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByLabelText(/main navigation/i)).toBeInTheDocument();
    });
  });
});
