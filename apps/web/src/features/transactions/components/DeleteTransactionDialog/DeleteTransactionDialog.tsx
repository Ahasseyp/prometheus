import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { Dialog } from '@/components/ui/dialog.js';
import { Spinner } from '@/components/ui/spinner.js';
import { FormError } from '@/components/form/FormError.js';
import {
  useDeleteTransaction,
  type Transaction,
} from '@/features/transactions/gateways/transactions.js';
import { getTransactionMutationErrorMessage } from '@/features/transactions/lib/transaction-errors.js';

export interface DeleteTransactionDialogProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function DeleteTransactionDialog({ transaction, onClose }: DeleteTransactionDialogProps) {
  const { mutate, isPending } = useDeleteTransaction();
  const [error, setError] = useState<string | null>(null);

  if (transaction === null) {
    return null;
  }

  const label = transaction.description || transaction.categoryName;

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setError(null);
      return;
    }
    onClose();
  }

  function handleDelete() {
    if (transaction === null) {
      return;
    }

    mutate(
      { id: transaction.id },
      {
        onSuccess: () => onClose(),
        onError: (mutationError) => setError(getTransactionMutationErrorMessage(mutationError)),
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
              'Delete transaction'
            )}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
