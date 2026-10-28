import { Dialog } from '@/components/ui/dialog.js';
import { Sheet } from '@/components/ui/sheet.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import type { Transfer } from '@/features/transfers/gateways/transfers.js';
import { TransferForm } from '@/features/transfers/components/TransferForm/TransferForm.js';
import { useIsMobile } from '@/hooks/use-mobile.js';

export interface TransferFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts?: Account[];
  transfer?: Transfer;
}

export function TransferFormDialog({
  open,
  onOpenChange,
  accounts,
  transfer,
}: TransferFormDialogProps) {
  const isMobile = useIsMobile();
  const isEditing = transfer !== undefined;
  const title = isEditing ? 'Edit transfer' : 'Add transfer';
  const description = isEditing
    ? 'Update the transfer details.'
    : 'Move money between your accounts.';

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
            <TransferForm accounts={accounts} transfer={transfer} onSuccess={handleSuccess} />
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
        <TransferForm accounts={accounts} transfer={transfer} onSuccess={handleSuccess} />
      </Dialog.Content>
    </Dialog>
  );
}
