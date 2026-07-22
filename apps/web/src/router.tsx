import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';

import { AuthenticatedLayout } from './components/layout/AuthenticatedLayout.js';
import { LoginPage } from './pages/login.js';
import { OverviewPage } from './pages/overview.js';
import { AccountsPage } from './pages/accounts.js';
import { TransactionsPage } from './pages/transactions.js';
import { BudgetsPage } from './pages/budgets.js';
import { GoalsPage } from './pages/goals.js';
import { RegisterPage } from './pages/register.js';

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

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

const routeTree = rootRoute.addChildren([
  authenticatedRoute.addChildren([
    indexRoute,
    accountsRoute,
    transactionsRoute,
    budgetsRoute,
    goalsRoute,
  ]),
  loginRoute,
  registerRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
