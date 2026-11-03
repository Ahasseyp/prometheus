import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge.js';
import { Skeleton } from '@/components/ui/skeleton.js';

import type { Category } from '@/features/categories/gateways/categories.js';
import type { Budget } from '@/features/budgets/gateways/budgets.js';
import { useBudgetProgress } from '@/features/budgets/gateways/budgets.js';
import {
  getBudgetCategoryNames,
  getBudgetProgressPercent,
  getBudgetTitle,
  isOverBudget,
} from '@/features/budgets/lib/budget-presentation.js';
import { BudgetsErrorState } from '@/features/budgets/components/BudgetsErrorState/BudgetsErrorState.js';
import { formatMoney } from '@/lib/format-money.js';
import { cn } from '@/lib/utils.js';

type BudgetProgressProps = {
  budget: Budget;
  categories: Category[];
};

export function BudgetProgress({ budget, categories }: BudgetProgressProps) {
  const { data: progress, isPending, isError, refetch } = useBudgetProgress(budget.id);
  const categoryNames = getBudgetCategoryNames(budget, categories);
  const title = getBudgetTitle(budget, categoryNames);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3" aria-label={`Loading ${title} progress`}>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (isError || progress === undefined) {
    return (
      <BudgetsErrorState
        title="We couldn't load this budget's progress"
        onRetry={() => void refetch()}
      />
    );
  }

  const overBudget = isOverBudget(progress.remaining);
  const overBudgetAmount = progress.remaining.trim().replace(/^-/, '');
  const progressPercent = getBudgetProgressPercent(
    progress.spent,
    progress.available,
    progress.currency
  );

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{title}</p>
          {budget.name.trim().length > 0 && (
            <p className="truncate text-sm text-muted-foreground">{categoryNames}</p>
          )}
        </div>
        <Badge variant={overBudget ? 'destructive' : 'secondary'}>
          {overBudget ? 'Over budget' : 'On track'}
        </Badge>
      </div>
      {overBudget && (
        <p className="text-sm font-medium text-destructive">
          Over by {formatMoney(overBudgetAmount, progress.currency)}
        </p>
      )}

      <div
        role="progressbar"
        aria-label={`${title} spending progress`}
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
          <dt className="text-muted-foreground">Spent</dt>
          <dd className="font-medium tabular-nums">
            {formatMoney(progress.spent, progress.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Available</dt>
          <dd className="font-medium tabular-nums">
            {formatMoney(progress.available, progress.currency)}
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
            {formatMoney(progress.remaining, progress.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Rollover</dt>
          <dd className="font-medium tabular-nums">
            {budget.rolloverEnabled ? formatMoney(progress.rollover, progress.currency) : 'Off'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Started</dt>
          <dd className="font-medium">{format(new Date(budget.startDate), 'PPP')}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Limit</dt>
          <dd className="font-medium tabular-nums">
            {formatMoney(progress.limit, progress.currency)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
