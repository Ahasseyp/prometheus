import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { useIsMobile } from '@/hooks/use-mobile.js';
import { useCategories } from '@/features/categories/gateways/categories.js';
import { useBudgets } from '@/features/budgets/gateways/budgets.js';
import { BudgetCard } from '@/features/budgets/components/BudgetCard/BudgetCard.js';
import { BudgetList } from '@/features/budgets/components/BudgetList/BudgetList.js';

export function BudgetsManager() {
  const [createStubVisible, setCreateStubVisible] = useState(false);
  const isMobile = useIsMobile();
  const {
    data: budgets,
    isPending: isBudgetsPending,
    isError: isBudgetsError,
    refetch: refetchBudgets,
  } = useBudgets();
  const {
    data: categories,
    isPending: isCategoriesPending,
    isError: isCategoriesError,
    refetch: refetchCategories,
  } = useCategories();
  const isLoading = isBudgetsPending || isCategoriesPending;
  const isError = !isLoading && (isBudgetsError || isCategoriesError);

  function retryBudgets() {
    void Promise.all([refetchBudgets(), refetchCategories()]);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        <Button onClick={() => setCreateStubVisible(true)}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Add budget
        </Button>
      </header>

      <Card>
        <Card.Header>
          <Card.Title>Current period</Card.Title>
          <Card.Description>Track spending limits by Category.</Card.Description>
        </Card.Header>
        <Card.Content className="flex min-h-[28rem] flex-col gap-4">
          {isMobile ? (
            <BudgetCard
              budgets={budgets}
              categories={categories}
              isLoading={isLoading}
              isError={isError}
              onRetry={retryBudgets}
            />
          ) : (
            <BudgetList
              budgets={budgets}
              categories={categories}
              isLoading={isLoading}
              isError={isError}
              onRetry={retryBudgets}
            />
          )}
          {createStubVisible && (
            <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-center text-muted-foreground">
              BudgetFormDialog
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
