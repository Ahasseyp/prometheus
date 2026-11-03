import { Badge } from '@/components/ui/badge.js';

import type { Goal } from '@/features/goals/gateways/goals.js';
import { getGoalSavedLabel } from '@/features/goals/lib/goal-presentation.js';

export interface GoalProgressProps {
  goal: Goal;
}

// Saved progress as amounts; the progress bar lands with Contribution
// management in a later slice.
export function GoalProgress({ goal }: GoalProgressProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{goal.name}</span>
        <Badge variant="outline">{goal.currency}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {getGoalSavedLabel(goal.savedAmount, goal.target, goal.currency)}
      </p>
    </div>
  );
}
