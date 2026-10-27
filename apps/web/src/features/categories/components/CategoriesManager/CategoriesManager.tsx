import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { Tabs } from '@/components/ui/tabs.js';

import { useCategories } from '@/features/categories/gateways/categories.js';
import type { Category } from '@/features/categories/gateways/categories.js';
import { CategoryFormDialog } from '@/features/categories/components/CategoryFormDialog/CategoryFormDialog.js';
import { CategoryList } from '@/features/categories/components/CategoryList/CategoryList.js';

const CATEGORY_TYPES = ['expense', 'income'] as const;
type CategoryType = (typeof CATEGORY_TYPES)[number];

function isCategoryType(value: string): value is CategoryType {
  return CATEGORY_TYPES.includes(value as CategoryType);
}

export function CategoriesManager() {
  const { data: categories, isPending, isError, refetch } = useCategories();
  const [type, setType] = useState<CategoryType>('expense');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>();
  const categoriesForType = categories?.filter((category) => category.type === type);

  function openCreateDialog() {
    setSelectedCategory(undefined);
    setFormOpen(true);
  }

  function openRenameDialog(category: Category) {
    setSelectedCategory(category);
    setFormOpen(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <Button onClick={openCreateDialog}>
          <Plus aria-hidden="true" />
          Add category
        </Button>
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
            onRename={openRenameDialog}
            onDelete={() => {}}
          />
        </Card.Content>
      </Card>
      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        type={type}
        category={selectedCategory}
        categories={categoriesForType ?? []}
      />
    </div>
  );
}
