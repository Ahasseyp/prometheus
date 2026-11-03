import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { Dialog } from '@/components/ui/dialog.js';
import { Spinner } from '@/components/ui/spinner.js';
import { FormError } from '@/components/form/FormError.js';
import { useDeleteBudget, type Budget } from '@/features/budgets/gateways/budgets.js';
import { getBudgetMutationErrorMessage } from '@/features/budgets/lib/budget-errors.js';

export interface DeleteBudgetDialogProps {
  budget: Budget | null;
  label: string;
  onClose: () => void;
}

export function DeleteBudgetDialog({ budget, label, onClose }: DeleteBudgetDialogProps) {
  const { mutate, isPending } = useDeleteBudget();
  const [error, setError] = useState<string | null>(null);

  if (budget === null) {
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
    if (budget === null) {
      return;
    }

    mutate(
      { id: budget.id },
      {
        onSuccess: () => onClose(),
        onError: (mutationError) => setError(getBudgetMutationErrorMessage(mutationError)),
      }
    );
  }

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Delete {label}?</Dialog.Title>
          <Dialog.Description>This can't be undone.</Dialog.Description>
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
              'Delete budget'
            )}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
