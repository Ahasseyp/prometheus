import { Goal as GoalIcon } from 'lucide-react';

import { Card } from '@/components/ui/card.js';
import { ButtonLink } from '@/components/molecules/ButtonLink/ButtonLink.js';
import { GoalListSkeleton } from '@/features/goals/components/GoalListSkeleton/GoalListSkeleton.js';
import { GoalsEmptyState } from '@/features/goals/components/GoalsEmptyState/GoalsEmptyState.js';
import { GoalsErrorState } from '@/features/goals/components/GoalsErrorState/GoalsErrorState.js';
import { useGoals } from '@/features/goals/gateways/goals.js';
import {
  getGoalProgressPercent,
  getGoalSavedLabel,
} from '@/features/goals/lib/goal-presentation.js';
import { cn } from '@/lib/utils.js';

// Only the most relevant goals fit on the Overview; the rest live on the
// Goals page.
const overviewGoalLimit = 3;

export function GoalsOverviewCard() {
  const { data: goals, isPending, isError, refetch } = useGoals();

  return (
    <Card>
      <Card.Header>
        <Card.Action>
          <ButtonLink to="/goals" variant="ghost" size="sm">
            View all
          </ButtonLink>
        </Card.Action>
        <div className="flex items-center gap-2">
          <GoalIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          <Card.Title>Goals</Card.Title>
        </div>
        <Card.Description>Progress toward your savings targets.</Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        {isPending ? (
          <GoalListSkeleton />
        ) : isError ? (
          <GoalsErrorState title="We couldn't load your goals" onRetry={() => void refetch()} />
        ) : goals === undefined || goals.length === 0 ? (
          <GoalsEmptyState />
        ) : (
          <div className="flex flex-col gap-4">
            {goals.slice(0, overviewGoalLimit).map((goal) => {
              const progressPercent = getGoalProgressPercent(
                goal.savedAmount,
                goal.target,
                goal.currency
              );
              const isComplete = progressPercent >= 100;

              return (
                <div key={goal.id} className="flex min-w-0 flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{goal.name}</p>
                    <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {isComplete ? 'Target reached' : `${progressPercent}%`}
                    </p>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${goal.name} savings progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPercent}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className={cn(
                        'h-full rounded-full',
                        isComplete ? 'bg-green-600' : 'bg-primary'
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getGoalSavedLabel(goal.savedAmount, goal.target, goal.currency)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
