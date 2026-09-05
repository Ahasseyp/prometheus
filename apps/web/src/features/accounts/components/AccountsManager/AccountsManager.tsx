import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { AccountFormDialog } from '@/features/accounts/components/AccountFormDialog/AccountFormDialog.js';
import { AccountList } from '@/features/accounts/components/AccountList/AccountList.js';
import { DeleteAccountDialog } from '@/features/accounts/components/DeleteAccountDialog/DeleteAccountDialog.js';
import { useAccounts, type Account } from '@/features/accounts/gateways/accounts.js';

export function AccountsManager() {
  const { data: accounts, isPending, isError, refetch } = useAccounts();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);

  function openCreateForm() {
    setEditingAccount(undefined);
    setFormOpen(true);
  }

  function openEditForm(account: Account) {
    setEditingAccount(account);
    setFormOpen(true);
  }

  const showHeaderCreate = accounts !== undefined && accounts.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        {showHeaderCreate && (
          <Button onClick={openCreateForm}>
            <Plus data-icon="inline-start" />
            Add account
          </Button>
        )}
      </header>

      <Card>
        <Card.Content className="flex flex-col gap-3">
          <AccountList
            accounts={accounts}
            isLoading={isPending}
            isError={isError}
            onRetry={() => void refetch()}
            onEdit={openEditForm}
            onDelete={setDeletingAccount}
            emptyAction={openCreateForm}
          />
        </Card.Content>
      </Card>

      <AccountFormDialog open={formOpen} onOpenChange={setFormOpen} account={editingAccount} />
      <DeleteAccountDialog account={deletingAccount} onClose={() => setDeletingAccount(null)} />
    </div>
  );
}
