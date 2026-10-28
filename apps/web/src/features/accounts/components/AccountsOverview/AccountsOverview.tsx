import { useState } from 'react';

import { AccountsOverviewCard } from '@/features/accounts/components/AccountsOverviewCard/AccountsOverviewCard.js';
import { AccountSummary } from '@/features/accounts/components/AccountSummary/AccountSummary.js';
import { useAccounts } from '@/features/accounts/gateways/accounts.js';
import { useAuthHouseholdState } from '@/features/auth/hooks/useAuthHouseholdState.js';
import { useReportingSummary } from '@/features/reporting/gateways/reporting.js';

export function AccountsOverview() {
  const { household } = useAuthHouseholdState();
  const { data: accounts, isPending, isError, refetch } = useAccounts();
  const { data: reportingSummary, isPending: isReportingPending } = useReportingSummary();
  const [showConvertedBalances, setShowConvertedBalances] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {household?.name ?? 'Personal'} overview
        </h1>
      </section>

      <AccountSummary
        accountCount={accounts?.length ?? 0}
        summary={reportingSummary}
        isLoading={isPending || isReportingPending}
      />

      <AccountsOverviewCard
        accounts={accounts}
        reportingAccounts={reportingSummary?.accounts}
        reportingCurrency={reportingSummary?.reportingCurrency}
        showConvertedBalances={showConvertedBalances}
        onToggleConvertedBalances={() => setShowConvertedBalances((current) => !current)}
        isLoading={isPending}
        isError={isError}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
