import { Dialog } from '@/components/ui/dialog.js';
import { Sheet } from '@/components/ui/sheet.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import type { Transaction } from '@/features/transactions/gateways/transactions.js';
import { TransactionForm } from '@/features/transactions/components/TransactionForm/TransactionForm.js';
import { useIsMobile } from '@/hooks/use-mobile.js';

export interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts?: Account[];
  transaction?: Transaction;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  accounts,
  transaction,
}: TransactionFormDialogProps) {
  const isMobile = useIsMobile();
  const isEditing = transaction !== undefined;
  const title = isEditing ? 'Edit transaction' : 'Add transaction';
  const description = isEditing
    ? 'Update the transaction details.'
    : 'Record an income or expense.';

  function handleSuccess() {
    onOpenChange(false);
  }

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <Sheet.Content side="bottom">
          <Sheet.Header>
            <Sheet.Title>{title}</Sheet.Title>
            <Sheet.Description>{description}</Sheet.Description>
          </Sheet.Header>
          <div className="px-4 pb-4">
            <TransactionForm
              accounts={accounts}
              transaction={transaction}
              onSuccess={handleSuccess}
            />
          </div>
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
        <TransactionForm accounts={accounts} transaction={transaction} onSuccess={handleSuccess} />
      </Dialog.Content>
    </Dialog>
  );
}
