import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.js';
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
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <AccountForm account={account} onSuccess={handleSuccess} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <AccountForm account={account} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
