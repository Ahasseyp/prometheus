import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { Dialog } from '@/components/ui/dialog.js';
import { Spinner } from '@/components/ui/spinner.js';
import { FormError } from '@/components/form/FormError.js';
import {
  useSkipRecurringTransaction,
  type RecurringTransaction,
} from '@/features/recurring-transactions/gateways/recurring-transactions.js';
import { getRecurringTransactionMutationErrorMessage } from '@/features/recurring-transactions/lib/recurring-transaction-errors.js';
import { formatRecurringTransactionDate } from '@/features/recurring-transactions/lib/recurring-transaction-presentation.js';

export interface SkipRecurringOccurrenceDialogProps {
  recurringTransaction: RecurringTransaction | null;
  onClose: () => void;
}

export function SkipRecurringOccurrenceDialog({
  recurringTransaction,
  onClose,
}: SkipRecurringOccurrenceDialogProps) {
  const { mutate, isPending } = useSkipRecurringTransaction();
  const [error, setError] = useState<string | null>(null);

  if (recurringTransaction === null) {
    return null;
  }

  const transaction = recurringTransaction;
  const label = transaction.description || transaction.categoryName;
  const nextDate = formatRecurringTransactionDate(transaction.nextDate);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setError(null);
      return;
    }
    onClose();
  }

  function handleSkip() {
    mutate(
      { id: transaction.id },
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
          <Dialog.Title>Skip next occurrence?</Dialog.Title>
          <Dialog.Description>
            Skip the {nextDate} occurrence of “{label}”. The schedule will continue as normal after
            that date.
          </Dialog.Description>
        </Dialog.Header>
        {error && <FormError message={error} />}
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button variant="destructive" onClick={handleSkip} disabled={isPending}>
            {isPending ? (
              <>
                <Spinner data-icon="inline-start" />
                Skipping…
              </>
            ) : (
              'Skip occurrence'
            )}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
