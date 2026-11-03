import { Dialog } from '@/components/ui/dialog.js';
import { Sheet } from '@/components/ui/sheet.js';
import { useIsMobile } from '@/hooks/use-mobile.js';

import {
  RecurringTransactionForm,
  type RecurringTransactionFormProps,
} from '@/features/recurring-transactions/components/RecurringTransactionForm/RecurringTransactionForm.js';
import type { RecurringTransaction } from '@/features/recurring-transactions/gateways/recurring-transactions.js';

export interface RecurringTransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurringTransaction?: RecurringTransaction;
}

export function RecurringTransactionFormDialog({
  open,
  onOpenChange,
  recurringTransaction,
}: RecurringTransactionFormDialogProps) {
  const isMobile = useIsMobile();
  const isEditing = recurringTransaction !== undefined;
  const title = isEditing ? 'Edit recurring transaction' : 'Add recurring transaction';
  const description = isEditing
    ? 'Update the schedule details; generated transactions stay unchanged.'
    : 'Set up a schedule that generates income or expense transactions.';

  function handleSuccess() {
    onOpenChange(false);
  }

  const formProps: RecurringTransactionFormProps = {
    recurringTransaction,
    onSuccess: handleSuccess,
  };
  const form = <RecurringTransactionForm {...formProps} />;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <Sheet.Content side="bottom">
          <Sheet.Header>
            <Sheet.Title>{title}</Sheet.Title>
            <Sheet.Description>{description}</Sheet.Description>
          </Sheet.Header>
          <div className="px-4 pb-4">{form}</div>
        </Sheet.Content>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
        </Dialog.Header>
        {form}
      </Dialog.Content>
    </Dialog>
  );
}
