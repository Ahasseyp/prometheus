import { useQuery } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type CategoryListOutput = inferRouterOutputs<AppRouter>['category']['list'];
export type Category = CategoryListOutput[number];

const categoriesListQueryKey = ['categories', 'list'];

export function useCategories() {
  return useQuery({
    queryKey: categoriesListQueryKey,
    queryFn: () => trpc.category.list.query(),
  });
}
