import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { useAccounts } from '@/features/accounts/gateways/accounts.js';
import {
  useGoalContributionLists,
  useGoals,
  type Goal,
  type GoalContribution,
} from '@/features/goals/gateways/goals.js';
import { GoalList } from '@/features/goals/components/GoalList/GoalList.js';
import { GoalFormDialog } from '@/features/goals/components/GoalFormDialog/GoalFormDialog.js';
import { DeleteGoalDialog } from '@/features/goals/components/DeleteGoalDialog/DeleteGoalDialog.js';
import { ContributionFormDialog } from '@/features/goals/components/ContributionFormDialog/ContributionFormDialog.js';
import { DeleteContributionDialog } from '@/features/goals/components/DeleteContributionDialog/DeleteContributionDialog.js';

export function GoalsManager() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [contributionDialog, setContributionDialog] = useState<
    | { mode: 'add'; goal: Goal }
    | { mode: 'edit'; goal: Goal; contribution: GoalContribution }
    | null
  >(null);
  const [deletingContribution, setDeletingContribution] = useState<{
    goal: Goal;
    contribution: GoalContribution;
  } | null>(null);
  const {
    data: goals,
    isPending: isGoalsPending,
    isError: isGoalsError,
    refetch: refetchGoals,
  } = useGoals();
  const { data: accounts } = useAccounts();
  const goalIds = useMemo(() => goals?.map((goal) => goal.id) ?? [], [goals]);
  const contributionQueries = useGoalContributionLists(goalIds);
  const contributionsByGoal = useMemo(
    () => new Map(goalIds.map((goalId, index) => [goalId, contributionQueries[index]])),
    [goalIds, contributionQueries]
  );
  const isLoading = isGoalsPending;
  const isError = !isLoading && isGoalsError;

  function openCreateForm() {
    setEditingGoal(undefined);
    setFormOpen(true);
  }

  function openEditForm(goal: Goal) {
    setEditingGoal(goal);
    setFormOpen(true);
  }

  function handleFormOpenChange(nextOpen: boolean) {
    setFormOpen(nextOpen);
    if (!nextOpen) {
      setEditingGoal(undefined);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <Button onClick={openCreateForm}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Add goal
        </Button>
      </header>

      <GoalList
        goals={goals}
        accounts={accounts ?? []}
        contributionsByGoal={contributionsByGoal}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetchGoals()}
        onContribute={(goal) => setContributionDialog({ mode: 'add', goal })}
        onEdit={openEditForm}
        onDelete={setDeletingGoal}
        onEditContribution={(goal, contribution) =>
          setContributionDialog({ mode: 'edit', goal, contribution })
        }
        onDeleteContribution={(goal, contribution) =>
          setDeletingContribution({ goal, contribution })
        }
      />

      <GoalFormDialog open={formOpen} onOpenChange={handleFormOpenChange} goal={editingGoal} />
      <DeleteGoalDialog
        goal={deletingGoal}
        label={deletingGoal?.name ?? ''}
        onClose={() => setDeletingGoal(null)}
      />
      <ContributionFormDialog
        open={contributionDialog !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setContributionDialog(null);
          }
        }}
        goal={contributionDialog?.goal ?? null}
        accounts={accounts ?? []}
        contribution={
          contributionDialog?.mode === 'edit' ? contributionDialog.contribution : undefined
        }
      />
      <DeleteContributionDialog
        contribution={deletingContribution?.contribution ?? null}
        label={
          deletingContribution ? `the ${deletingContribution.contribution.amount} contribution` : ''
        }
        onClose={() => setDeletingContribution(null)}
      />
    </div>
  );
}
