import { Card } from '@/components/ui/card.js';
import { Badge } from '@/components/ui/badge.js';
import { Skeleton } from '@/components/ui/skeleton.js';

import type { Account } from '@/features/accounts/gateways/accounts.js';
import type { UseQueryResult } from '@tanstack/react-query';

import { ContributeButton } from '@/features/goals/components/ContributeButton/ContributeButton.js';
import { ContributionActions } from '@/features/goals/components/ContributionActions/ContributionActions.js';
import { GoalActions } from '@/features/goals/components/GoalActions/GoalActions.js';
import { GoalProgress } from '@/features/goals/components/GoalProgress/GoalProgress.js';
import { GoalsErrorState } from '@/features/goals/components/GoalsErrorState/GoalsErrorState.js';
import type {
  Goal,
  GoalContribution,
  GoalContributionListOutput,
} from '@/features/goals/gateways/goals.js';
import {
  getContributionDateLabel,
  getGoalDeadlineLabel,
} from '@/features/goals/lib/goal-presentation.js';
import { formatMoney } from '@/lib/format-money.js';

export interface GoalCardProps {
  goal: Goal;
  accounts: Account[];
  contributions: UseQueryResult<GoalContributionListOutput, Error>;
  onContribute: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onEditContribution: (goal: Goal, contribution: GoalContribution) => void;
  onDeleteContribution: (goal: Goal, contribution: GoalContribution) => void;
}

function accountName(accounts: Account[], accountId: string): string {
  return accounts.find((account) => account.id === accountId)?.name ?? 'Unknown account';
}

export function GoalCard({
  goal,
  accounts,
  contributions,
  onContribute,
  onEdit,
  onDelete,
  onEditContribution,
  onDeleteContribution,
}: GoalCardProps) {
  return (
    <Card size="sm">
      <Card.Header>
        <Card.Action>
          <ContributeButton goal={goal} onClick={onContribute} />
          <GoalActions label={goal.name} goal={goal} onEdit={onEdit} onDelete={onDelete} />
        </Card.Action>
        <div className="flex items-center gap-2">
          <Card.Title>{goal.name}</Card.Title>
          <Badge variant="outline">{goal.currency}</Badge>
        </div>
        <Card.Description>Due {getGoalDeadlineLabel(goal.deadline)}</Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        <GoalProgress goal={goal} />

        <div className="flex flex-col gap-1 border-t pt-3">
          <p className="text-sm font-medium text-muted-foreground">Contributions</p>
          {contributions.isPending ? (
            <Skeleton className="h-10 w-full" />
          ) : contributions.isError ? (
            <GoalsErrorState
              title="We couldn't load the contributions"
              onRetry={() => void contributions.refetch()}
            />
          ) : contributions.data === undefined || contributions.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contributions yet.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {contributions.data.map((contribution) => (
                <li key={contribution.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {accountName(accounts, contribution.accountId)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getContributionDateLabel(contribution.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium tabular-nums">
                      {formatMoney(contribution.amount, goal.currency)}
                    </span>
                    <ContributionActions
                      label={`contribution of ${formatMoney(contribution.amount, goal.currency)}`}
                      contribution={contribution}
                      onEdit={(c) => onEditContribution(goal, c)}
                      onDelete={(c) => onDeleteContribution(goal, c)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}
