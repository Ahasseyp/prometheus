import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js';
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {account.name}?</DialogTitle>
          <DialogDescription>This can't be undone.</DialogDescription>
        </DialogHeader>
        {error && <FormError message={error} />}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
