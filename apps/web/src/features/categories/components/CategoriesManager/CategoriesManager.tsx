import { useState } from 'react';

import { Card } from '@/components/ui/card.js';
import { Tabs } from '@/components/ui/tabs.js';

import { useCategories } from '@/features/categories/gateways/categories.js';
import { CategoryList } from '@/features/categories/components/CategoryList/CategoryList.js';

const CATEGORY_TYPES = ['expense', 'income'] as const;
type CategoryType = (typeof CATEGORY_TYPES)[number];

function isCategoryType(value: string): value is CategoryType {
  return CATEGORY_TYPES.includes(value as CategoryType);
}

export function CategoriesManager() {
  const { data: categories, isPending, isError, refetch } = useCategories();
  const [type, setType] = useState<CategoryType>('expense');
  const categoriesForType = categories?.filter((category) => category.type === type);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
      </header>

      <Card>
        <Card.Header>
          <Tabs
            value={type}
            onValueChange={(value) => {
              if (isCategoryType(value)) {
                setType(value);
              }
            }}
          >
            <Tabs.List>
              <Tabs.Trigger value="expense">Expenses</Tabs.Trigger>
              <Tabs.Trigger value="income">Income</Tabs.Trigger>
            </Tabs.List>
          </Tabs>
        </Card.Header>
        <Card.Content flush>
          <CategoryList
            categories={categoriesForType}
            isLoading={isPending}
            isError={isError}
            onRetry={() => void refetch()}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
