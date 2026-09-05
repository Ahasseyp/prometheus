import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { Dialog } from '@/components/ui/dialog.js';
import { Spinner } from '@/components/ui/spinner.js';
import { FormError } from '@/components/form/FormError.js';
import { useDeleteAccount, type Account } from '@/features/accounts/gateways/accounts.js';
import { getAccountMutationErrorMessage } from '@/features/accounts/lib/account-errors.js';

export interface DeleteAccountDialogProps {
  account: Account | null;
  onClose: () => void;
}

export function DeleteAccountDialog({ account, onClose }: DeleteAccountDialogProps) {
  const { mutate, isPending } = useDeleteAccount();
  const [error, setError] = useState<string | null>(null);

  if (account === null) {
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
    if (account === null) {
      return;
    }

    mutate(
      { id: account.id },
      {
        onSuccess: () => onClose(),
        onError: (mutationError) => setError(getAccountMutationErrorMessage(mutationError)),
      }
    );
  }

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Delete {account.name}?</Dialog.Title>
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
              'Delete account'
            )}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
