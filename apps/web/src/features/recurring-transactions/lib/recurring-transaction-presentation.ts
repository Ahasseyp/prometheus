import { format } from 'date-fns';
import type { RecurringTransaction } from '@/features/recurring-transactions/gateways/recurring-transactions.js';

export function getFrequencyLabel(frequency: RecurringTransaction['frequency']): string {
  return frequency.charAt(0).toUpperCase() + frequency.slice(1);
}

export function formatRecurringTransactionDate(date: string | Date): string {
  return format(new Date(date), 'PPP');
}
