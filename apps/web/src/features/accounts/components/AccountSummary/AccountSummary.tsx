import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import { Skeleton } from '@/components/ui/skeleton.js';
import { sumAccountTotals } from '@/features/accounts/lib/account-totals.js';
import { formatMinorUnits } from '@/features/accounts/lib/format-money.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import type { CurrencyTotal } from '@/features/accounts/lib/account-totals.js';
import { cn } from '@/lib/utils.js';

export interface AccountSummaryProps {
  accounts: Account[];
  isLoading?: boolean;
}

function getSummaryFooterText(accounts: Account[], totals: CurrencyTotal[]): string {
  if (accounts.length === 0) {
    return 'Add an account to see your total.';
  }
  if (totals.length > 1) {
    return `Across ${totals.length} currencies`;
  }
  if (accounts.length === 1) {
    return '1 account';
  }
  return `Across ${accounts.length} accounts`;
}

function SummaryTitle({ isLoading, totals }: { isLoading: boolean; totals: CurrencyTotal[] }) {
  if (isLoading) {
    return <Skeleton className="h-9 w-32" />;
  }
  if (totals.length === 0) {
    return <CardTitle className="text-3xl font-semibold">—</CardTitle>;
  }
  return (
    <div className="flex flex-col gap-1 pt-1">
      {totals.map((total) => (
        <p
          key={total.currency}
          className={cn('text-2xl font-semibold', total.minorUnits < 0n && 'text-destructive')}
        >
          {formatMinorUnits(total.minorUnits, total.currency)}
        </p>
      ))}
    </div>
  );
}

function SummaryFooter({
  isLoading,
  accounts,
  totals,
}: {
  isLoading: boolean;
  accounts: Account[];
  totals: CurrencyTotal[];
}) {
  if (isLoading) {
    return <Skeleton className="h-5 w-36" />;
  }
  return <p className="text-sm text-muted-foreground">{getSummaryFooterText(accounts, totals)}</p>;
}

export function AccountSummary({ accounts, isLoading = false }: AccountSummaryProps) {
  const totals = sumAccountTotals(accounts);

  return (
    <Card className="bg-gradient-card glow-internal">
      <CardHeader>
        <CardDescription>Total balance</CardDescription>
        <SummaryTitle isLoading={isLoading} totals={totals} />
      </CardHeader>
      <CardContent>
        <SummaryFooter isLoading={isLoading} accounts={accounts} totals={totals} />
      </CardContent>
    </Card>
  );
}
