import { Table } from '@/components/ui/table.js';

import type { Goal } from '@/features/goals/gateways/goals.js';
import { GoalActions } from '@/features/goals/components/GoalActions/GoalActions.js';
import { GoalListSkeleton } from '@/features/goals/components/GoalListSkeleton/GoalListSkeleton.js';
import { GoalProgress } from '@/features/goals/components/GoalProgress/GoalProgress.js';
import { GoalsEmptyState } from '@/features/goals/components/GoalsEmptyState/GoalsEmptyState.js';
import { GoalsErrorState } from '@/features/goals/components/GoalsErrorState/GoalsErrorState.js';
import { getGoalDeadlineLabel } from '@/features/goals/lib/goal-presentation.js';

export interface GoalListProps {
  goals?: Goal[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onEdit?: (goal: Goal) => void;
  onDelete?: (goal: Goal) => void;
}

export function GoalList({ goals, isLoading, isError, onRetry, onEdit, onDelete }: GoalListProps) {
  if (isLoading) {
    return <GoalListSkeleton />;
  }

  if (isError) {
    return <GoalsErrorState title="We couldn't load your goals" onRetry={onRetry} />;
  }

  if (goals === undefined || goals.length === 0) {
    return <GoalsEmptyState />;
  }

  const showActions = onEdit !== undefined && onDelete !== undefined;

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.Head>Goal</Table.Head>
          <Table.Head>Deadline</Table.Head>
          {showActions && (
            <Table.Head className="w-12">
              <span className="sr-only">Actions</span>
            </Table.Head>
          )}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {goals.map((goal) => (
          <Table.Row key={goal.id}>
            <Table.Cell className="w-full min-w-72">
              <GoalProgress goal={goal} />
            </Table.Cell>
            <Table.Cell className="align-top text-muted-foreground">
              {getGoalDeadlineLabel(goal.deadline)}
            </Table.Cell>
            {showActions && (
              <Table.Cell className="align-top">
                <GoalActions
                  label={goal.name}
                  goal={goal}
                  onEdit={() => onEdit(goal)}
                  onDelete={() => onDelete(goal)}
                />
              </Table.Cell>
            )}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
