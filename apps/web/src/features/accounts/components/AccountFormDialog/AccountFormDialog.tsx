import { Dialog } from '@/components/ui/dialog.js';
import { Sheet } from '@/components/ui/sheet.js';
import { AccountForm } from '@/features/accounts/components/AccountForm/AccountForm.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import { useIsMobile } from '@/hooks/use-mobile.js';

export interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
}

export function AccountFormDialog({ open, onOpenChange, account }: AccountFormDialogProps) {
  const isMobile = useIsMobile();
  const isEditing = account !== undefined;
  const title = isEditing ? 'Edit account' : 'Add account';
  const description = isEditing
    ? 'Update the account details.'
    : 'Add an account to start tracking its balance.';

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
            <AccountForm account={account} onSuccess={handleSuccess} />
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
        <AccountForm account={account} onSuccess={handleSuccess} />
      </Dialog.Content>
    </Dialog>
  );
}
