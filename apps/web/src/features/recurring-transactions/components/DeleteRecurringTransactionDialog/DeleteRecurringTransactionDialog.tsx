import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { Dialog } from '@/components/ui/dialog.js';

import { Spinner } from '@/components/ui/spinner.js';
import { Switch } from '@/components/ui/switch.js';
import { FormError } from '@/components/form/FormError.js';
import {
  useDeleteRecurringTransaction,
  type RecurringTransaction,
} from '@/features/recurring-transactions/gateways/recurring-transactions.js';
import { getRecurringTransactionMutationErrorMessage } from '@/features/recurring-transactions/lib/recurring-transaction-errors.js';

export interface DeleteRecurringTransactionDialogProps {
  recurringTransaction: RecurringTransaction | null;
  onClose: () => void;
}

export function DeleteRecurringTransactionDialog({
  recurringTransaction,
  onClose,
}: DeleteRecurringTransactionDialogProps) {
  const { mutate, isPending } = useDeleteRecurringTransaction();
  const [error, setError] = useState<string | null>(null);
  const [removeGenerated, setRemoveGenerated] = useState(false);

  if (recurringTransaction === null) {
    return null;
  }

  const transaction = recurringTransaction;
  const label = transaction.description || transaction.categoryName;

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setError(null);
      return;
    }
    onClose();
  }

  function handleRemoveGeneratedChange(checked: boolean) {
    setRemoveGenerated(checked);
  }

  function handleDelete() {
    mutate(
      { id: transaction.id, removeGenerated },
      {
        onSuccess: () => onClose(),
        onError: (mutationError) =>
          setError(getRecurringTransactionMutationErrorMessage(mutationError)),
      }
    );
  }

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Delete {label}?</Dialog.Title>
          <Dialog.Description>
            The schedule will stop generating new transactions.
          </Dialog.Description>
        </Dialog.Header>
        {error && <FormError message={error} />}
        <label className="flex flex-row items-center gap-3 text-sm">
          <Switch
            checked={removeGenerated}
            onCheckedChange={handleRemoveGeneratedChange}
            aria-labelledby="remove-generated-label"
          />
          <span id="remove-generated-label">Also remove already generated transactions</span>
        </label>
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? (
              <>
                <Spinner data-icon="inline-start" />
                Deleting…
              </>
            ) : (
              'Delete schedule'
            )}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
