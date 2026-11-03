import type { UseQueryResult } from '@tanstack/react-query';

import type { Account } from '@/features/accounts/gateways/accounts.js';
import { GoalCard } from '@/features/goals/components/GoalCard/GoalCard.js';
import { GoalListSkeleton } from '@/features/goals/components/GoalListSkeleton/GoalListSkeleton.js';
import { GoalsEmptyState } from '@/features/goals/components/GoalsEmptyState/GoalsEmptyState.js';
import { GoalsErrorState } from '@/features/goals/components/GoalsErrorState/GoalsErrorState.js';
import type {
  Goal,
  GoalContribution,
  GoalContributionListOutput,
} from '@/features/goals/gateways/goals.js';

export interface GoalListProps {
  goals?: Goal[];
  accounts: Account[];
  contributionsByGoal: Map<string, UseQueryResult<GoalContributionListOutput, Error>>;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onContribute: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onEditContribution: (goal: Goal, contribution: GoalContribution) => void;
  onDeleteContribution: (goal: Goal, contribution: GoalContribution) => void;
}

export function GoalList({
  goals,
  accounts,
  contributionsByGoal,
  isLoading,
  isError,
  onRetry,
  onContribute,
  onEdit,
  onDelete,
  onEditContribution,
  onDeleteContribution,
}: GoalListProps) {
  if (isLoading) {
    return <GoalListSkeleton />;
  }

  if (isError) {
    return <GoalsErrorState title="We couldn't load your goals" onRetry={onRetry} />;
  }

  if (goals === undefined || goals.length === 0) {
    return <GoalsEmptyState />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          accounts={accounts}
          contributions={contributionsByGoal.get(goal.id) ?? idleContributionsQuery}
          onContribute={onContribute}
          onEdit={onEdit}
          onDelete={onDelete}
          onEditContribution={onEditContribution}
          onDeleteContribution={onDeleteContribution}
        />
      ))}
    </div>
  );
}

// Goals and their contributions load in parallel; a goal renders with an idle
// query for the moment before its contribution query mounts.
const idleContributionsQuery = {
  data: undefined,
  isPending: true,
  isError: false,
  refetch: () => Promise.reject(new Error('Contribution query not mounted')),
} as UseQueryResult<GoalContributionListOutput, Error>;
