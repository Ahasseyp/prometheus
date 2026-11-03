import type { Goal } from '@/features/goals/gateways/goals.js';
import {
  getGoalProgressPercent,
  getGoalSavedLabel,
} from '@/features/goals/lib/goal-presentation.js';
import { cn } from '@/lib/utils.js';

export interface GoalProgressProps {
  goal: Goal;
}

export function GoalProgress({ goal }: GoalProgressProps) {
  const progressPercent = getGoalProgressPercent(goal.savedAmount, goal.target, goal.currency);
  const isComplete = progressPercent >= 100;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        role="progressbar"
        aria-label={`${goal.name} savings progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn('h-full rounded-full', isComplete ? 'bg-green-600' : 'bg-primary')}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {getGoalSavedLabel(goal.savedAmount, goal.target, goal.currency)}
        {isComplete ? ' — target reached' : ` (${progressPercent}%)`}
      </p>
    </div>
  );
}
