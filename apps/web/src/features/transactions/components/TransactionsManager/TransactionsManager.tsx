import { useState } from 'react';
import { ArrowRightLeft, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { useAccounts } from '@/features/accounts/gateways/accounts.js';
import { TransferFormDialog } from '@/features/transfers/components/TransferFormDialog/TransferFormDialog.js';
import { DeleteTransferDialog } from '@/features/transfers/components/DeleteTransferDialog/DeleteTransferDialog.js';
import { DeleteTransactionDialog } from '@/features/transactions/components/DeleteTransactionDialog/DeleteTransactionDialog.js';
import { TransactionActionSheet } from '@/features/transactions/components/TransactionActionSheet/TransactionActionSheet.js';
import { TransactionFilters } from '@/features/transactions/components/TransactionFilters/TransactionFilters.js';
import { TransactionFormDialog } from '@/features/transactions/components/TransactionFormDialog/TransactionFormDialog.js';
import { TransactionList } from '@/features/transactions/components/TransactionList/TransactionList.js';
import {
  useTransactions,
  type Transaction,
  type TransactionFilters as Filters,
} from '@/features/transactions/gateways/transactions.js';

export function TransactionsManager() {
  const { data: accounts } = useAccounts();
  const [filters, setFilters] = useState<Filters>({});
  const { data: transactions, isPending, isError, refetch } = useTransactions(filters);
  const [formOpen, setFormOpen] = useState(false);
  const [transferFormOpen, setTransferFormOpen] = useState(false);
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null);
  const [deletingTransferId, setDeletingTransferId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null);
  const isFiltered =
    filters.accountId !== undefined || filters.from !== undefined || filters.to !== undefined;

  function openCreateForm() {
    setEditingTransaction(undefined);
    setFormOpen(true);
  }

  function openTransferForm() {
    setEditingTransferId(null);
    setTransferFormOpen(true);
  }

  function handleTransferFormOpenChange(nextOpen: boolean) {
    setTransferFormOpen(nextOpen);
    if (!nextOpen) {
      setEditingTransferId(null);
    }
  }

  // A linked Transfer is edited and deleted as one unit from either side; the
  // backend rejects single-Transaction mutations on both of its Transactions.
  function openEditForm(transaction: Transaction) {
    if (transaction.transfer !== null) {
      setEditingTransferId(transaction.transfer.id);
      setTransferFormOpen(true);
      return;
    }
    setEditingTransaction(transaction);
    setFormOpen(true);
  }

  function openDeleteConfirmation(transaction: Transaction) {
    if (transaction.transfer !== null) {
      setDeletingTransferId(transaction.transfer.id);
      return;
    }
    setDeletingTransaction(transaction);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openTransferForm}>
            <ArrowRightLeft data-icon="inline-start" />
            Transfer
          </Button>
          <Button onClick={openCreateForm}>
            <Plus data-icon="inline-start" />
            Add transaction
          </Button>
        </div>
      </header>

      <TransactionFilters accounts={accounts} value={filters} onChange={setFilters} />

      <Card>
        <Card.Content className="-my-(--card-spacing) px-0">
          <TransactionList
            transactions={transactions}
            isLoading={isPending}
            isError={isError}
            onRetry={() => void refetch()}
            isFiltered={isFiltered}
            emptyAction={openCreateForm}
            onEdit={openEditForm}
            onDelete={openDeleteConfirmation}
            onSelect={setActiveTransaction}
          />
        </Card.Content>
      </Card>

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        accounts={accounts}
        transaction={editingTransaction}
      />
      <TransferFormDialog
        open={transferFormOpen}
        onOpenChange={handleTransferFormOpenChange}
        accounts={accounts}
        transferId={editingTransferId}
      />
      <DeleteTransactionDialog
        transaction={deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
      />
      <DeleteTransferDialog
        transferId={deletingTransferId}
        onClose={() => setDeletingTransferId(null)}
      />
      <TransactionActionSheet
        transaction={activeTransaction}
        onClose={() => setActiveTransaction(null)}
        onEdit={openEditForm}
        onDelete={openDeleteConfirmation}
      />
    </div>
  );
}
