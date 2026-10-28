import { AlertCircle } from 'lucide-react';

import { Alert } from '@/components/ui/alert.js';
import { Button } from '@/components/ui/button.js';
import { AccountListSkeleton } from '@/features/accounts/components/AccountListSkeleton/AccountListSkeleton.js';
import { AccountRow } from '@/features/accounts/components/AccountRow/AccountRow.js';
import { AccountsEmptyState } from '@/features/accounts/components/AccountsEmptyState/AccountsEmptyState.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import type { ReportingAccount } from '@/features/reporting/gateways/reporting.js';

export interface AccountListProps {
  accounts?: Account[];
  reportingAccounts?: ReportingAccount[];
  reportingCurrency?: string;
  showConvertedBalances?: boolean;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onEdit?: (account: Account) => void;
  onDelete?: (account: Account) => void;
  skeletonRows?: number;
  emptyAction?: () => void;
}

export function AccountList({
  accounts,
  reportingAccounts,
  reportingCurrency,
  showConvertedBalances = false,
  isLoading,
  isError,
  onRetry,
  onEdit,
  onDelete,
  skeletonRows,
  emptyAction,
}: AccountListProps) {
  if (isLoading) {
    return <AccountListSkeleton rows={skeletonRows} />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <Alert.Title>We couldn't load your accounts</Alert.Title>
        <Alert.Description>Check your connection and try again.</Alert.Description>
        <Alert.Action>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </Alert.Action>
      </Alert>
    );
  }

  if (accounts === undefined || accounts.length === 0) {
    return <AccountsEmptyState onAddAccount={emptyAction} />;
  }

  return (
    <>
      {accounts.map((account) => {
        const reportingAccount = reportingAccounts?.find(({ id }) => id === account.id);
        return (
          <AccountRow
            key={account.id}
            account={account}
            convertedBalance={
              showConvertedBalances ? reportingAccount?.convertedBalance : undefined
            }
            reportingCurrency={showConvertedBalances ? reportingCurrency : undefined}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      })}
    </>
  );
}
