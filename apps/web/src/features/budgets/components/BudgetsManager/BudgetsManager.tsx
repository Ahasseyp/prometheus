import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { useIsMobile } from '@/hooks/use-mobile.js';
import { useCategories } from '@/features/categories/gateways/categories.js';
import { useHouseholdMe } from '@/features/household/gateways/household.js';
import { useBudgets, type Budget } from '@/features/budgets/gateways/budgets.js';
import { BudgetCard } from '@/features/budgets/components/BudgetCard/BudgetCard.js';
import { BudgetFormDialog } from '@/features/budgets/components/BudgetFormDialog/BudgetFormDialog.js';
import { BudgetList } from '@/features/budgets/components/BudgetList/BudgetList.js';
import { DeleteBudgetDialog } from '@/features/budgets/components/DeleteBudgetDialog/DeleteBudgetDialog.js';
import {
  getBudgetCategoryNames,
  getBudgetTitle,
} from '@/features/budgets/lib/budget-presentation.js';

export function BudgetsManager() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);
  const [deletingBudgetLabel, setDeletingBudgetLabel] = useState('');
  const isMobile = useIsMobile();
  const { data: householdData } = useHouseholdMe();
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

  function openCreateForm() {
    setEditingBudget(undefined);
    setFormOpen(true);
  }

  function openEditForm(budget: Budget) {
    setEditingBudget(budget);
    setFormOpen(true);
  }

  function openDeleteConfirmation(budget: Budget) {
    const categoryNames = getBudgetCategoryNames(budget, categories ?? []);
    setDeletingBudgetLabel(getBudgetTitle(budget, categoryNames));
    setDeletingBudget(budget);
  }

  function handleFormOpenChange(nextOpen: boolean) {
    setFormOpen(nextOpen);
    if (!nextOpen) {
      setEditingBudget(undefined);
    }
  }

  function handleDeleteDialogClose() {
    setDeletingBudget(null);
    setDeletingBudgetLabel('');
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        <Button onClick={openCreateForm}>
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
              onEdit={openEditForm}
              onDelete={openDeleteConfirmation}
            />
          ) : (
            <BudgetList
              budgets={budgets}
              categories={categories}
              isLoading={isLoading}
              isError={isError}
              onRetry={retryBudgets}
              onEdit={openEditForm}
              onDelete={openDeleteConfirmation}
            />
          )}
        </Card.Content>
      </Card>

      <BudgetFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        budget={editingBudget}
        categories={categories ?? []}
        reportingCurrency={householdData?.household?.reportingCurrency}
      />
      <DeleteBudgetDialog
        budget={deletingBudget}
        label={deletingBudgetLabel}
        onClose={handleDeleteDialogClose}
      />
    </div>
  );
}
