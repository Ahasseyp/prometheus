import { Card } from '@/components/ui/card.js';

import type { Goal } from '@/features/goals/gateways/goals.js';
import { GoalActions } from '@/features/goals/components/GoalActions/GoalActions.js';
import { GoalListSkeleton } from '@/features/goals/components/GoalListSkeleton/GoalListSkeleton.js';
import { GoalProgress } from '@/features/goals/components/GoalProgress/GoalProgress.js';
import { GoalsEmptyState } from '@/features/goals/components/GoalsEmptyState/GoalsEmptyState.js';
import { GoalsErrorState } from '@/features/goals/components/GoalsErrorState/GoalsErrorState.js';
import { getGoalDeadlineLabel } from '@/features/goals/lib/goal-presentation.js';

export interface GoalCardProps {
  goals?: Goal[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onEdit?: (goal: Goal) => void;
  onDelete?: (goal: Goal) => void;
}

export function GoalCard({ goals, isLoading, isError, onRetry, onEdit, onDelete }: GoalCardProps) {
  if (isLoading) {
    return <GoalListSkeleton cards />;
  }

  if (isError) {
    return <GoalsErrorState title="We couldn't load your goals" onRetry={onRetry} />;
  }

  if (goals === undefined || goals.length === 0) {
    return <GoalsEmptyState />;
  }

  const showActions = onEdit !== undefined && onDelete !== undefined;

  return (
    <div className="grid gap-4">
      {goals.map((goal) => (
        <Card key={goal.id} size="sm">
          <Card.Content className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Due {getGoalDeadlineLabel(goal.deadline)}
              </span>
              {showActions && (
                <GoalActions
                  label={goal.name}
                  goal={goal}
                  onEdit={() => onEdit(goal)}
                  onDelete={() => onDelete(goal)}
                />
              )}
            </div>
            <GoalProgress goal={goal} />
          </Card.Content>
        </Card>
      ))}
    </div>
  );
}
