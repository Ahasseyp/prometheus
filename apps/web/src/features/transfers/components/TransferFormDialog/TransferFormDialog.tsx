import { Dialog } from '@/components/ui/dialog.js';
import { Sheet } from '@/components/ui/sheet.js';
import { Spinner } from '@/components/ui/spinner.js';
import { FormError } from '@/components/form/FormError.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import { useTransfer } from '@/features/transfers/gateways/transfers.js';
import { TransferForm } from '@/features/transfers/components/TransferForm/TransferForm.js';
import { useIsMobile } from '@/hooks/use-mobile.js';

export interface TransferFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts?: Account[];
  // When set, the dialog loads the Transfer and edits it; when null, it
  // creates a new one.
  transferId: string | null;
}

export function TransferFormDialog({
  open,
  onOpenChange,
  accounts,
  transferId,
}: TransferFormDialogProps) {
  const isMobile = useIsMobile();
  const isEditing = transferId !== null;
  const {
    data: transfer,
    isPending,
    isError,
  } = useTransfer(isEditing && open ? transferId : undefined);
  const title = isEditing ? 'Edit transfer' : 'Add transfer';
  const description = isEditing
    ? 'Update the transfer details.'
    : 'Move money between your accounts.';

  function handleSuccess() {
    onOpenChange(false);
  }

  function renderBody() {
    if (isEditing && isPending) {
      return (
        <div className="flex justify-center py-8">
          <Spinner aria-label="Loading transfer" />
        </div>
      );
    }
    if (isEditing && (isError || transfer === undefined)) {
      return <FormError message="We couldn't load this transfer. Close and try again." />;
    }
    return <TransferForm accounts={accounts} transfer={transfer} onSuccess={handleSuccess} />;
  }

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <Sheet.Content side="bottom">
          <Sheet.Header>
            <Sheet.Title>{title}</Sheet.Title>
            <Sheet.Description>{description}</Sheet.Description>
          </Sheet.Header>
          <div className="px-4 pb-4">{renderBody()}</div>
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
        {renderBody()}
      </Dialog.Content>
    </Dialog>
  );
}
