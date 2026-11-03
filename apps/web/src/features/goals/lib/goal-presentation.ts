import { format } from 'date-fns';

import { formatMoney } from '@/lib/format-money.js';

export function getGoalDeadlineLabel(deadline: string): string {
  return format(new Date(deadline), 'MMM d, yyyy');
}

// Saved progress is rendered as amounts in this slice; the progress bar
// lands with Contribution management.
export function getGoalSavedLabel(savedAmount: string, target: string, currency: string): string {
  return `${formatMoney(savedAmount, currency)} of ${formatMoney(target, currency)} saved`;
}
