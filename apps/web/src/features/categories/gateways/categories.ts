import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type CategoryListOutput = inferRouterOutputs<AppRouter>['category']['list'];
export type Category = CategoryListOutput[number];
type CreateCategoryInput = inferRouterInputs<AppRouter>['category']['create'];
type UpdateCategoryInput = inferRouterInputs<AppRouter>['category']['update'];
type DeleteCategoryInput = inferRouterInputs<AppRouter>['category']['delete'];

const categoriesListQueryKey = ['categories', 'list'];

export function useCategories() {
  return useQuery({
    queryKey: categoriesListQueryKey,
    queryFn: () => trpc.category.list.query(),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => trpc.category.create.mutate(input),
    onSuccess: () => invalidateCategories(queryClient),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCategoryInput) => trpc.category.update.mutate(input),
    onSuccess: () => invalidateCategories(queryClient),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteCategoryInput) => trpc.category.delete.mutate(input),
    onSuccess: () => invalidateCategories(queryClient),
  });
}

function invalidateCategories(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: categoriesListQueryKey });
}
