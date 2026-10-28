import { Table } from '@/components/ui/table.js';

import type { Category } from '@/features/categories/gateways/categories.js';
import type { Budget } from '@/features/budgets/gateways/budgets.js';
import { BudgetListSkeleton } from '@/features/budgets/components/BudgetListSkeleton/BudgetListSkeleton.js';
import { BudgetProgress } from '@/features/budgets/components/BudgetProgress/BudgetProgress.js';
import { BudgetsEmptyState } from '@/features/budgets/components/BudgetsEmptyState/BudgetsEmptyState.js';
import { BudgetsErrorState } from '@/features/budgets/components/BudgetsErrorState/BudgetsErrorState.js';
import { getBudgetPeriodLabel } from '@/features/budgets/lib/budget-presentation.js';

export interface BudgetListProps {
  budgets?: Budget[];
  categories?: Category[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function BudgetList({
  budgets,
  categories = [],
  isLoading,
  isError,
  onRetry,
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

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.Head>Budget</Table.Head>
          <Table.Head>Period</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {budgets.map((budget) => (
          <Table.Row key={budget.id}>
            <Table.Cell className="w-full min-w-72">
              <BudgetProgress budget={budget} categories={categories} />
            </Table.Cell>
            <Table.Cell className="align-top text-muted-foreground">
              {getBudgetPeriodLabel(budget.period)}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
