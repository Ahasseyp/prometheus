import { AlertCircle } from 'lucide-react';

import { Alert } from '@/components/ui/alert.js';
import { Button } from '@/components/ui/button.js';

import type { Category } from '@/features/categories/gateways/categories.js';
import { groupCategories } from '@/features/categories/lib/group-categories.js';
import { CategoriesEmptyState } from '@/features/categories/components/CategoriesEmptyState/CategoriesEmptyState.js';
import { CategoryFlatList } from '@/features/categories/components/CategoryFlatList/CategoryFlatList.js';
import { CategoryListSkeleton } from '@/features/categories/components/CategoryListSkeleton/CategoryListSkeleton.js';

export interface CategoryListProps {
  categories?: Category[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function CategoryList({ categories, isLoading, isError, onRetry }: CategoryListProps) {
  if (isLoading) {
    return <CategoryListSkeleton />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <Alert.Title>We couldn't load your categories</Alert.Title>
        <Alert.Description>Check your connection and try again.</Alert.Description>
        <Alert.Action>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </Alert.Action>
      </Alert>
    );
  }

  if (categories === undefined || categories.length === 0) {
    return <CategoriesEmptyState />;
  }

  return <CategoryFlatList groups={groupCategories(categories)} />;
}
