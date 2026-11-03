import { Table } from '@/components/ui/table.js';

import type { RecurringTransaction } from '@/features/recurring-transactions/gateways/recurring-transactions.js';
import { RecurringTransactionListSkeleton } from '@/features/recurring-transactions/components/RecurringTransactionListSkeleton/RecurringTransactionListSkeleton.js';
import { RecurringTransactionRow } from '@/features/recurring-transactions/components/RecurringTransactionRow/RecurringTransactionRow.js';
import { RecurringTransactionsEmptyState } from '@/features/recurring-transactions/components/RecurringTransactionsEmptyState/RecurringTransactionsEmptyState.js';
import { RecurringTransactionsErrorState } from '@/features/recurring-transactions/components/RecurringTransactionsErrorState/RecurringTransactionsErrorState.js';

export interface RecurringTransactionListProps {
  recurringTransactions?: RecurringTransaction[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onAdd?: () => void;
  onEdit?: (recurringTransaction: RecurringTransaction) => void;
  onDelete?: (recurringTransaction: RecurringTransaction) => void;
  onSkip?: (recurringTransaction: RecurringTransaction) => void;
}

export function RecurringTransactionList({
  recurringTransactions,
  isLoading,
  isError,
  onRetry,
  onAdd,
  onEdit,
  onDelete,
  onSkip,
}: RecurringTransactionListProps) {
  if (isLoading) {
    return <RecurringTransactionListSkeleton />;
  }

  if (isError) {
    return (
      <RecurringTransactionsErrorState
        title="We couldn't load your recurring transactions"
        onRetry={onRetry}
      />
    );
  }

  if (recurringTransactions === undefined || recurringTransactions.length === 0) {
    return <RecurringTransactionsEmptyState onAdd={onAdd} />;
  }

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.Head>Schedule</Table.Head>
          <Table.Head>Account</Table.Head>
          <Table.Head>Repeats</Table.Head>
          <Table.Head>Next occurrence</Table.Head>
          <Table.Head className="text-right">Amount</Table.Head>
          <Table.Head>
            <span className="sr-only">Actions</span>
          </Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {recurringTransactions.map((recurringTransaction) => (
          <RecurringTransactionRow
            key={recurringTransaction.id}
            recurringTransaction={recurringTransaction}
            onEdit={onEdit}
            onDelete={onDelete}
            onSkip={onSkip}
          />
        ))}
      </Table.Body>
    </Table>
  );
}
