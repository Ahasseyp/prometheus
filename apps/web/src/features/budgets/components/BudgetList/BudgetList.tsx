import { Table } from '@/components/ui/table.js';

import type { Category } from '@/features/categories/gateways/categories.js';
import type { Budget } from '@/features/budgets/gateways/budgets.js';
import { BudgetActions } from '@/features/budgets/components/BudgetActions/BudgetActions.js';
import { BudgetListSkeleton } from '@/features/budgets/components/BudgetListSkeleton/BudgetListSkeleton.js';
import { BudgetProgress } from '@/features/budgets/components/BudgetProgress/BudgetProgress.js';
import { BudgetsEmptyState } from '@/features/budgets/components/BudgetsEmptyState/BudgetsEmptyState.js';
import { BudgetsErrorState } from '@/features/budgets/components/BudgetsErrorState/BudgetsErrorState.js';
import {
  getBudgetCategoryNames,
  getBudgetPeriodLabel,
  getBudgetTitle,
} from '@/features/budgets/lib/budget-presentation.js';

export interface BudgetListProps {
  budgets?: Budget[];
  categories?: Category[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onEdit?: (budget: Budget) => void;
  onDelete?: (budget: Budget) => void;
}

export function BudgetList({
  budgets,
  categories = [],
  isLoading,
  isError,
  onRetry,
  onEdit,
  onDelete,
}: BudgetListProps) {
  if (isLoading) {
    return <BudgetListSkeleton />;
  }

  if (isError) {
    return <BudgetsErrorState title="We couldn't load your budgets" onRetry={onRetry} />;
  }

  if (budgets === undefined || budgets.length === 0) {
    return <BudgetsEmptyState />;
  }

  const showActions = onEdit !== undefined && onDelete !== undefined;

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.Head>Budget</Table.Head>
          <Table.Head>Period</Table.Head>
          {showActions && (
            <Table.Head className="w-12">
              <span className="sr-only">Actions</span>
            </Table.Head>
          )}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {budgets.map((budget) => {
          const categoryNames = getBudgetCategoryNames(budget, categories);
          const title = getBudgetTitle(budget, categoryNames);

          return (
            <Table.Row key={budget.id}>
              <Table.Cell className="w-full min-w-72">
                <BudgetProgress budget={budget} categories={categories} />
              </Table.Cell>
              <Table.Cell className="align-top text-muted-foreground">
                {getBudgetPeriodLabel(budget.period)}
              </Table.Cell>
              {showActions && (
                <Table.Cell className="align-top">
                  <BudgetActions
                    label={title}
                    budget={budget}
                    onEdit={() => onEdit(budget)}
                    onDelete={() => onDelete(budget)}
                  />
                </Table.Cell>
              )}
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
