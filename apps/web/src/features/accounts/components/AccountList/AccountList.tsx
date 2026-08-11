import { AlertCircle } from 'lucide-react';

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert.js';
import { Button } from '@/components/ui/button.js';
import { AccountListSkeleton } from '@/features/accounts/components/AccountListSkeleton/AccountListSkeleton.js';
import { AccountRow } from '@/features/accounts/components/AccountRow/AccountRow.js';
import { AccountsEmptyState } from '@/features/accounts/components/AccountsEmptyState/AccountsEmptyState.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';

export interface AccountListProps {
  accounts?: Account[];
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
  isLoading,
  isError,
  onRetry,
  onEdit,
  onDelete,
  skeletonRows,
  emptyAction,
}: AccountListProps) {
  return (
    <>
      {isLoading && <AccountListSkeleton rows={skeletonRows} />}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>We couldn't load your accounts</AlertTitle>
          <AlertDescription>Check your connection and try again.</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </AlertAction>
        </Alert>
      )}
      {accounts && accounts.length === 0 && <AccountsEmptyState onAddAccount={emptyAction} />}
      {accounts?.map((account) => (
        <AccountRow key={account.id} account={account} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  );
}
