import { act, render, type RenderResult } from '@testing-library/react';
import { type FC } from 'react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';

import { createQueryClientWrapper } from './providers.js';

export type RenderRouterOptions = {
  initialEntries?: string[];
};

export async function renderWithRouter(
  Subject: FC,
  options: RenderRouterOptions = {}
): Promise<RenderResult> {
  const history = createMemoryHistory({ initialEntries: options.initialEntries ?? ['/'] });

  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });

  const subjectRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: Subject,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([subjectRoute]),
    history,
  });

  await router.load();

  const QueryClientWrapper = createQueryClientWrapper();

  const result = render(
    <QueryClientWrapper>
      <RouterProvider router={router} />
    </QueryClientWrapper>
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return result;
}
