import { AccountsOverviewCard } from '@/features/accounts/components/AccountsOverviewCard/AccountsOverviewCard.js';
import { AccountSummary } from '@/features/accounts/components/AccountSummary/AccountSummary.js';
import { useAccounts } from '@/features/accounts/gateways/accounts.js';
import { useAuthHouseholdState } from '@/features/auth/hooks/useAuthHouseholdState.js';

export function AccountsOverview() {
  const { household } = useAuthHouseholdState();
  const { data: accounts, isPending, isError, refetch } = useAccounts();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {household?.name ?? 'Personal'} overview
        </h1>
      </section>

      <AccountSummary accounts={accounts ?? []} isLoading={isPending} />

      <AccountsOverviewCard
        accounts={accounts}
        isLoading={isPending}
        isError={isError}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
