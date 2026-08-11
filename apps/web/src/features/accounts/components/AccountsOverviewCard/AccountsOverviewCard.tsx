import { Wallet } from 'lucide-react';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.js';
import { ButtonLink } from '@/components/molecules/ButtonLink/ButtonLink.js';
import { AccountList } from '@/features/accounts/components/AccountList/AccountList.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';

export interface AccountsOverviewCardProps {
  accounts?: Account[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function AccountsOverviewCard({
  accounts,
  isLoading,
  isError,
  onRetry,
}: AccountsOverviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardAction>
          <ButtonLink to="/accounts" variant="ghost" size="sm">
            View all
          </ButtonLink>
        </CardAction>
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle>Accounts</CardTitle>
        </div>
        <CardDescription>Your accounts and balances</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <AccountList
          accounts={accounts}
          isLoading={isLoading}
          isError={isError}
          onRetry={onRetry}
          skeletonRows={2}
        />
      </CardContent>
    </Card>
  );
}
