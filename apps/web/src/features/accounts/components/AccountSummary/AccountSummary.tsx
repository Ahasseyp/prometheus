import { Card } from '@/components/ui/card.js';
import { Skeleton } from '@/components/ui/skeleton.js';
import type { ReportingSummary } from '@/features/reporting/gateways/reporting.js';
import { formatMoney } from '@/lib/format-money.js';
import { cn } from '@/lib/utils.js';

export interface AccountSummaryProps {
  accountCount: number;
  summary?: ReportingSummary;
  isLoading?: boolean;
}

function getSummaryFooterText(accountCount: number): string {
  if (accountCount === 0) {
    return 'Add an account to see your net worth.';
  }
  if (accountCount === 1) {
    return '1 account';
  }
  return `Across ${accountCount} accounts`;
}

export function AccountSummary({ accountCount, summary, isLoading = false }: AccountSummaryProps) {
  const netWorth = summary?.netWorth;

  return (
    <Card className="bg-gradient-card glow-internal">
      <Card.Header>
        <Card.Description>
          Net worth{summary ? ` in ${summary.reportingCurrency}` : ''}
        </Card.Description>
        {isLoading ? (
          <Skeleton className="h-9 w-32" />
        ) : accountCount === 0 ? (
          <Card.Title className="text-3xl font-semibold">—</Card.Title>
        ) : summary === undefined || netWorth == null ? (
          <Card.Title className="text-xl font-semibold">Conversion unavailable</Card.Title>
        ) : (
          <Card.Title
            className={cn('text-3xl font-semibold', netWorth.startsWith('-') && 'text-destructive')}
          >
            {formatMoney(netWorth, summary.reportingCurrency)}
          </Card.Title>
        )}
      </Card.Header>
      <Card.Content>
        {isLoading ? (
          <Skeleton className="h-5 w-36" />
        ) : (
          <p className="text-sm text-muted-foreground">{getSummaryFooterText(accountCount)}</p>
        )}
      </Card.Content>
    </Card>
  );
}
