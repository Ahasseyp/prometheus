import { format } from 'date-fns';
import type { RecurringTransaction } from '@/features/recurring-transactions/gateways/recurring-transactions.js';

const PERIOD_LABELS: Record<RecurringTransaction['period'], string> = {
  week: 'weeks',
  month: 'months',
  year: 'years',
};

export function formatRecurringTransactionDate(date: string | Date): string {
  return format(new Date(date), 'PPP');
}

export function getRecurrenceLabel(
  interval: RecurringTransaction['interval'],
  period: RecurringTransaction['period']
): string {
  const periodLabel = PERIOD_LABELS[period];
  if (interval === 1) {
    return `Every ${periodLabel.slice(0, -1)}`;
  }
  return `Every ${interval} ${periodLabel}`;
}
