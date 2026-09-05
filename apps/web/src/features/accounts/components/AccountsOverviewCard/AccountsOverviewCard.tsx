import { Wallet } from 'lucide-react';

import { Card } from '@/components/ui/card.js';
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
      <Card.Header>
        <Card.Action>
          <ButtonLink to="/accounts" variant="ghost" size="sm">
            View all
          </ButtonLink>
        </Card.Action>
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
          <Card.Title>Accounts</Card.Title>
        </div>
        <Card.Description>Your accounts and balances</Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        <AccountList
          accounts={accounts}
          isLoading={isLoading}
          isError={isError}
          onRetry={onRetry}
          skeletonRows={2}
        />
      </Card.Content>
    </Card>
  );
}
