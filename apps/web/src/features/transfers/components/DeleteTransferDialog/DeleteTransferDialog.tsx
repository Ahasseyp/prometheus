import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { Dialog } from '@/components/ui/dialog.js';
import { Spinner } from '@/components/ui/spinner.js';
import { FormError } from '@/components/form/FormError.js';
import { useDeleteTransfer } from '@/features/transfers/gateways/transfers.js';
import { getTransferMutationErrorMessage } from '@/features/transfers/lib/transfer-errors.js';

export interface DeleteTransferDialogProps {
  transferId: string | null;
  onClose: () => void;
}

export function DeleteTransferDialog({ transferId, onClose }: DeleteTransferDialogProps) {
  const { mutate, isPending } = useDeleteTransfer();
  const [error, setError] = useState<string | null>(null);

  if (transferId === null) {
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
    if (transferId === null) {
      return;
    }

    mutate(
      { id: transferId },
      {
        onSuccess: () => onClose(),
        onError: (mutationError) => setError(getTransferMutationErrorMessage(mutationError)),
      }
    );
  }

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Delete transfer?</Dialog.Title>
          <Dialog.Description>
            This removes the transaction from both accounts. This can't be undone.
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
              'Delete transfer'
            )}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
