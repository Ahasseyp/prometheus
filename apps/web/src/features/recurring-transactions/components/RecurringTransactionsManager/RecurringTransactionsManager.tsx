import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';

import {
  useRecurringTransactions,
  type RecurringTransaction,
} from '@/features/recurring-transactions/gateways/recurring-transactions.js';
import { RecurringTransactionList } from '@/features/recurring-transactions/components/RecurringTransactionList/RecurringTransactionList.js';
import { RecurringTransactionFormDialog } from '@/features/recurring-transactions/components/RecurringTransactionFormDialog/RecurringTransactionFormDialog.js';
import { DeleteRecurringTransactionDialog } from '@/features/recurring-transactions/components/DeleteRecurringTransactionDialog/DeleteRecurringTransactionDialog.js';
import { SkipRecurringTransactionInstanceDialog } from '@/features/recurring-transactions/components/SkipRecurringTransactionInstanceDialog/SkipRecurringTransactionInstanceDialog.js';

export function RecurringTransactionsManager() {
  const { data: recurringTransactions, isPending, isError, refetch } = useRecurringTransactions();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | undefined>(
    undefined
  );
  const [deletingTransaction, setDeletingTransaction] = useState<RecurringTransaction | null>(null);
  const [skippingTransaction, setSkippingTransaction] = useState<RecurringTransaction | null>(null);

  function openCreateForm() {
    setEditingTransaction(undefined);
    setFormOpen(true);
  }

  function openEditForm(recurringTransaction: RecurringTransaction) {
    setEditingTransaction(recurringTransaction);
    setFormOpen(true);
  }

  function handleFormOpenChange(nextOpen: boolean) {
    setFormOpen(nextOpen);
    if (!nextOpen) {
      setEditingTransaction(undefined);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Recurring Transactions</h1>
        <Button onClick={openCreateForm}>
          <Plus data-icon="inline-start" />
          Add recurring
        </Button>
      </header>

      <Card>
        <Card.Content className="-my-(--card-spacing) px-0">
          <RecurringTransactionList
            recurringTransactions={recurringTransactions}
            isLoading={isPending}
            isError={isError}
            onRetry={() => void refetch()}
            onAdd={openCreateForm}
            onEdit={openEditForm}
            onDelete={setDeletingTransaction}
            onSkip={setSkippingTransaction}
          />
        </Card.Content>
      </Card>

      <RecurringTransactionFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        recurringTransaction={editingTransaction}
      />
      <SkipRecurringTransactionInstanceDialog
        recurringTransaction={skippingTransaction}
        onClose={() => setSkippingTransaction(null)}
      />
      <DeleteRecurringTransactionDialog
        recurringTransaction={deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
      />
    </div>
  );
}
