import { AlertCircle } from 'lucide-react';

import { Alert } from '@/components/ui/alert.js';
import { Button } from '@/components/ui/button.js';
import { Table } from '@/components/ui/table.js';

import type { Transaction } from '@/features/transactions/gateways/transactions.js';
import { TransactionListSkeleton } from '@/features/transactions/components/TransactionListSkeleton/TransactionListSkeleton.js';
import { TransactionRow } from '@/features/transactions/components/TransactionRow/TransactionRow.js';
import { TransactionTableHead } from '@/features/transactions/components/TransactionTableHead/TransactionTableHead.js';
import { TransactionsEmptyState } from '@/features/transactions/components/TransactionsEmptyState/TransactionsEmptyState.js';

export interface TransactionListProps {
  transactions?: Transaction[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  isFiltered: boolean;
  skeletonRows?: number;
  emptyAction?: () => void;
}

export function TransactionList({
  transactions,
  isLoading,
  isError,
  onRetry,
  isFiltered,
  skeletonRows,
  emptyAction,
}: TransactionListProps) {
  if (isLoading) {
    return <TransactionListSkeleton rows={skeletonRows} />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <Alert.Title>We couldn't load your transactions</Alert.Title>
        <Alert.Description>Check your connection and try again.</Alert.Description>
        <Alert.Action>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </Alert.Action>
      </Alert>
    );
  }

  if (transactions === undefined || transactions.length === 0) {
    return <TransactionsEmptyState filtered={isFiltered} onAddTransaction={emptyAction} />;
  }

  return (
    <Table>
      <TransactionTableHead />
      <Table.Body>
        {transactions.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </Table.Body>
    </Table>
  );
}
