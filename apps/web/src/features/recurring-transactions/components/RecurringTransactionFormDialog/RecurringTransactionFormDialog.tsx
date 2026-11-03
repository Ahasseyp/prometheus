import { Dialog } from '@/components/ui/dialog.js';
import { Sheet } from '@/components/ui/sheet.js';
import { useIsMobile } from '@/hooks/use-mobile.js';

import { RecurringTransactionForm } from '@/features/recurring-transactions/components/RecurringTransactionForm/RecurringTransactionForm.js';

export interface RecurringTransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecurringTransactionFormDialog({
  open,
  onOpenChange,
}: RecurringTransactionFormDialogProps) {
  const isMobile = useIsMobile();
  const title = 'Add recurring transaction';
  const description = 'Set up a schedule that generates income or expense transactions.';

  function handleSuccess() {
    onOpenChange(false);
  }

  const form = <RecurringTransactionForm onSuccess={handleSuccess} />;

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
