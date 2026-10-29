import { Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge.js';
import { Card } from '@/components/ui/card.js';
import { ButtonLink } from '@/components/molecules/ButtonLink/ButtonLink.js';
import {
  useBudgetProgressList,
  useBudgets,
  type BudgetProgress,
} from '@/features/budgets/gateways/budgets.js';
import { BudgetListSkeleton } from '@/features/budgets/components/BudgetListSkeleton/BudgetListSkeleton.js';
import { BudgetsEmptyState } from '@/features/budgets/components/BudgetsEmptyState/BudgetsEmptyState.js';
import { BudgetsErrorState } from '@/features/budgets/components/BudgetsErrorState/BudgetsErrorState.js';
import {
  getBudgetProgressPercentFromMinorUnits,
  isOverBudget,
  sumBudgetMoney,
} from '@/features/budgets/lib/budget-presentation.js';
import { formatMinorUnits } from '@/lib/format-money.js';
import { cn } from '@/lib/utils.js';

function isBudgetProgress(progress: BudgetProgress | undefined): progress is BudgetProgress {
  return progress !== undefined;
}

export function BudgetsOverviewCard() {
  const { data: budgets, isPending, isError, refetch: refetchBudgets } = useBudgets();
  const budgetIds = budgets?.map((budget) => budget.id) ?? [];
  const progressQueries = useBudgetProgressList(budgetIds);
  const progresses = progressQueries.map((query) => query.data).filter(isBudgetProgress);
  const isLoading = isPending || progressQueries.some((query) => query.isPending);
  const isFailed = isError || progressQueries.some((query) => query.isError);

  function retryBudgets() {
    void Promise.all([refetchBudgets(), ...progressQueries.map((query) => query.refetch())]);
  }

  if (isLoading) {
    return (
      <Card>
        <BudgetsOverviewCardHeader />
        <Card.Content>
          <BudgetListSkeleton rows={2} />
        </Card.Content>
      </Card>
    );
  }

  if (isFailed) {
    return (
      <Card>
        <BudgetsOverviewCardHeader />
        <Card.Content>
          <BudgetsErrorState title="We couldn't load your budgets" onRetry={retryBudgets} />
        </Card.Content>
      </Card>
    );
  }

  if (budgets === undefined || budgets.length === 0) {
    return (
      <Card>
        <BudgetsOverviewCardHeader />
        <Card.Content>
          <BudgetsEmptyState />
        </Card.Content>
      </Card>
    );
  }

  const currency = progresses[0]?.currency;
  if (currency === undefined) {
    return null;
  }

  const spentMinorUnits = sumBudgetMoney(
    progresses.map((progress) => progress.spent),
    currency
  );
  const availableMinorUnits = sumBudgetMoney(
    progresses.map((progress) => progress.available),
    currency
  );
  const remainingMinorUnits = availableMinorUnits - spentMinorUnits;
  const progressPercent = getBudgetProgressPercentFromMinorUnits(
    spentMinorUnits,
    availableMinorUnits
  );
  const overBudgetCount = progresses.filter((progress) => isOverBudget(progress.remaining)).length;
  const overBudget = overBudgetCount > 0;

  return (
    <Card>
      <BudgetsOverviewCardHeader />
      <Card.Content className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Current period</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMinorUnits(spentMinorUnits, currency)}{' '}
              <span className="text-sm font-normal text-muted-foreground">spent</span>
            </p>
          </div>
          <Badge variant={overBudget ? 'destructive' : 'secondary'}>
            {overBudget ? `${overBudgetCount} over budget` : 'On track'}
          </Badge>
        </div>

        <div
          role="progressbar"
          aria-label="Current-period budget spending progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn('h-full rounded-full', overBudget ? 'bg-destructive' : 'bg-primary')}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Available</dt>
            <dd className="font-medium tabular-nums">
              {formatMinorUnits(availableMinorUnits, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Remaining</dt>
            <dd
              className={cn(
                'font-medium tabular-nums',
                overBudget ? 'text-destructive' : 'text-foreground'
              )}
            >
              {formatMinorUnits(remainingMinorUnits, currency)}
            </dd>
          </div>
        </dl>
      </Card.Content>
    </Card>
  );
}

function BudgetsOverviewCardHeader() {
  return (
    <Card.Header>
      <Card.Action>
        <ButtonLink to="/budgets" variant="ghost" size="sm">
          Manage budgets
        </ButtonLink>
      </Card.Action>
      <div className="flex items-center gap-2">
        <Target className="size-4 text-muted-foreground" aria-hidden="true" />
        <Card.Title>Budgets</Card.Title>
      </div>
      <Card.Description>Current-period spending progress</Card.Description>
    </Card.Header>
  );
}
