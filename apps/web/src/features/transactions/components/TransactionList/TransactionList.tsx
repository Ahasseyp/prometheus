import { AlertCircle } from 'lucide-react';

import { Alert } from '@/components/ui/alert.js';
import { Button } from '@/components/ui/button.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import type { Transaction } from '@/features/transactions/gateways/transactions.js';

import { TransactionListSkeleton } from '@/features/transactions/components/TransactionListSkeleton/TransactionListSkeleton.js';
import { TransactionRow } from '@/features/transactions/components/TransactionRow/TransactionRow.js';
import { TransactionsEmptyState } from '@/features/transactions/components/TransactionsEmptyState/TransactionsEmptyState.js';

export interface TransactionListProps {
  transactions?: Transaction[];
  accounts?: Account[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  isFiltered: boolean;
  skeletonRows?: number;
}

export function TransactionList({
  transactions,
  accounts,
  isLoading,
  isError,
  onRetry,
  isFiltered,
  skeletonRows,
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
    return <TransactionsEmptyState filtered={isFiltered} />;
  }

  const accountById = new Map(accounts?.map((account) => [account.id, account]));

  return (
    <>
      {transactions.map((transaction) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          account={accountById.get(transaction.accountId)}
        />
      ))}
    </>
  );
}
