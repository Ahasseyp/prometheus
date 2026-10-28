export interface ReportingCurrencyFormProps {
  reportingCurrency: string;
}

export function ReportingCurrencyForm({ reportingCurrency }: ReportingCurrencyFormProps) {
  return (
    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      ReportingCurrencyForm — Reporting Currency: {reportingCurrency}
    </div>
  );
}
