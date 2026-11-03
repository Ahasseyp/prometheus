import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { Dialog } from '@/components/ui/dialog.js';
import { Spinner } from '@/components/ui/spinner.js';
import { FormError } from '@/components/form/FormError.js';
import {
  useDeleteGoalContribution,
  type GoalContribution,
} from '@/features/goals/gateways/goals.js';
import { getGoalMutationErrorMessage } from '@/features/goals/lib/goal-errors.js';

export interface DeleteContributionDialogProps {
  contribution: GoalContribution | null;
  label: string;
  onClose: () => void;
}

export function DeleteContributionDialog({
  contribution,
  label,
  onClose,
}: DeleteContributionDialogProps) {
  const { mutate, isPending } = useDeleteGoalContribution();
  const [error, setError] = useState<string | null>(null);

  if (contribution === null) {
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
    if (contribution === null) {
      return;
    }

    mutate(
      { id: contribution.id },
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
            The earmarked money returns to the account&apos;s unallocated balance. This can&apos;t
            be undone.
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
              'Delete contribution'
            )}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
