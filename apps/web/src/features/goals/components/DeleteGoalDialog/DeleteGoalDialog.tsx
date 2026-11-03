import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { Dialog } from '@/components/ui/dialog.js';
import { Spinner } from '@/components/ui/spinner.js';
import { FormError } from '@/components/form/FormError.js';
import { useDeleteGoal, type Goal } from '@/features/goals/gateways/goals.js';
import { getGoalMutationErrorMessage } from '@/features/goals/lib/goal-errors.js';

export interface DeleteGoalDialogProps {
  goal: Goal | null;
  label: string;
  onClose: () => void;
}

export function DeleteGoalDialog({ goal, label, onClose }: DeleteGoalDialogProps) {
  const { mutate, isPending } = useDeleteGoal();
  const [error, setError] = useState<string | null>(null);

  if (goal === null) {
    return null;
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setError(null);
      return;
    }
    onClose();
  }

  function handleDelete() {
    if (goal === null) {
      return;
    }

    mutate(
      { id: goal.id },
      {
        onSuccess: () => onClose(),
        onError: (mutationError) => setError(getGoalMutationErrorMessage(mutationError)),
      }
    );
  }

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Delete {label}?</Dialog.Title>
          <Dialog.Description>
            Its Goal Contributions will be removed and the earmarked money unallocated. This
            can&apos;t be undone.
          </Dialog.Description>
        </Dialog.Header>
        {error && <FormError message={error} />}
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? (
              <>
                <Spinner data-icon="inline-start" />
                Deleting…
              </>
            ) : (
              'Delete goal'
            )}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
