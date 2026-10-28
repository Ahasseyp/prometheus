import { useAuthHouseholdState } from '@/features/auth/hooks/useAuthHouseholdState.js';
import { ReportingCurrencyForm } from '@/features/household/components/ReportingCurrencyForm/ReportingCurrencyForm.js';

export function HouseholdSettings() {
  const { household } = useAuthHouseholdState();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your Household preferences.</p>
      </section>

      <ReportingCurrencyForm reportingCurrency={household?.reportingCurrency ?? '—'} />
    </div>
  );
}
