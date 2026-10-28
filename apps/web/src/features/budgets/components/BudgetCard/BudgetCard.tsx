import { Badge } from '@/components/ui/badge.js';
import { Card } from '@/components/ui/card.js';

import type { Category } from '@/features/categories/gateways/categories.js';
import type { Budget } from '@/features/budgets/gateways/budgets.js';
import { BudgetListSkeleton } from '@/features/budgets/components/BudgetListSkeleton/BudgetListSkeleton.js';
import { BudgetProgress } from '@/features/budgets/components/BudgetProgress/BudgetProgress.js';
import { BudgetsEmptyState } from '@/features/budgets/components/BudgetsEmptyState/BudgetsEmptyState.js';
import { BudgetsErrorState } from '@/features/budgets/components/BudgetsErrorState/BudgetsErrorState.js';
import { getBudgetPeriodLabel } from '@/features/budgets/lib/budget-presentation.js';

export interface BudgetCardProps {
  budgets?: Budget[];
  categories?: Category[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function BudgetCard({
  budgets,
  categories = [],
  isLoading,
  isError,
  onRetry,
}: BudgetCardProps) {
  if (isLoading) {
    return <BudgetListSkeleton cards />;
  }

  if (isError) {
    return <BudgetsErrorState title="We couldn't load your budgets" onRetry={onRetry} />;
  }

  if (budgets === undefined || budgets.length === 0) {
    return <BudgetsEmptyState />;
  }

  return (
    <div className="grid gap-4">
      {budgets.map((budget) => (
        <Card key={budget.id} size="sm">
          <Card.Content className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="outline">{getBudgetPeriodLabel(budget.period)}</Badge>
            </div>
            <BudgetProgress budget={budget} categories={categories} />
          </Card.Content>
        </Card>
      ))}
    </div>
  );
}
