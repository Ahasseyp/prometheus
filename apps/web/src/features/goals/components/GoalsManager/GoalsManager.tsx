import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { useIsMobile } from '@/hooks/use-mobile.js';
import { useGoals, type Goal } from '@/features/goals/gateways/goals.js';
import { GoalCard } from '@/features/goals/components/GoalCard/GoalCard.js';
import { GoalFormDialog } from '@/features/goals/components/GoalFormDialog/GoalFormDialog.js';
import { GoalList } from '@/features/goals/components/GoalList/GoalList.js';
import { DeleteGoalDialog } from '@/features/goals/components/DeleteGoalDialog/DeleteGoalDialog.js';

export function GoalsManager() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const isMobile = useIsMobile();
  const {
    data: goals,
    isPending: isGoalsPending,
    isError: isGoalsError,
    refetch: refetchGoals,
  } = useGoals();
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

  function openDeleteConfirmation(goal: Goal) {
    setDeletingGoal(goal);
  }

  function handleFormOpenChange(nextOpen: boolean) {
    setFormOpen(nextOpen);
    if (!nextOpen) {
      setEditingGoal(undefined);
    }
  }

  function handleDeleteDialogClose() {
    setDeletingGoal(null);
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

      <Card>
        <Card.Header>
          <Card.Title>Savings goals</Card.Title>
          <Card.Description>Earmark money from your accounts toward a target.</Card.Description>
        </Card.Header>
        <Card.Content className="flex min-h-[28rem] flex-col gap-4">
          {isMobile ? (
            <GoalCard
              goals={goals}
              isLoading={isLoading}
              isError={isError}
              onRetry={() => void refetchGoals()}
              onEdit={openEditForm}
              onDelete={openDeleteConfirmation}
            />
          ) : (
            <GoalList
              goals={goals}
              isLoading={isLoading}
              isError={isError}
              onRetry={() => void refetchGoals()}
              onEdit={openEditForm}
              onDelete={openDeleteConfirmation}
            />
          )}
        </Card.Content>
      </Card>

      <GoalFormDialog open={formOpen} onOpenChange={handleFormOpenChange} goal={editingGoal} />
      <DeleteGoalDialog
        goal={deletingGoal}
        label={deletingGoal?.name ?? ''}
        onClose={handleDeleteDialogClose}
      />
    </div>
  );
}
