import { Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { ButtonLink } from '@/components/molecules/ButtonLink/ButtonLink.js';
import { AccountList } from '@/features/accounts/components/AccountList/AccountList.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import type { ReportingAccount } from '@/features/reporting/gateways/reporting.js';

export interface AccountsOverviewCardProps {
  accounts?: Account[];
  reportingAccounts?: ReportingAccount[];
  reportingCurrency?: string;
  showConvertedBalances: boolean;
  onToggleConvertedBalances: () => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function AccountsOverviewCard({
  accounts,
  reportingAccounts,
  reportingCurrency,
  showConvertedBalances,
  onToggleConvertedBalances,
  isLoading,
  isError,
  onRetry,
}: AccountsOverviewCardProps) {
  return (
    <Card>
      <Card.Header>
        <Card.Action className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onToggleConvertedBalances}>
            {showConvertedBalances ? 'Account balances' : 'Converted balances'}
          </Button>
          <ButtonLink to="/accounts" variant="ghost" size="sm">
            View all
          </ButtonLink>
        </Card.Action>
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
          <Card.Title>Accounts</Card.Title>
        </div>
        <Card.Description>
          {showConvertedBalances ? 'Balances in Reporting Currency' : 'Your accounts and balances'}
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        <AccountList
          accounts={accounts}
          reportingAccounts={reportingAccounts}
          reportingCurrency={reportingCurrency}
          showConvertedBalances={showConvertedBalances}
          isLoading={isLoading}
          isError={isError}
          onRetry={onRetry}
          skeletonRows={2}
        />
      </Card.Content>
    </Card>
  );
}
