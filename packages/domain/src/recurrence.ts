import { anchoredPeriodBoundsAt } from './budget-period.js';
import { RecurrencePeriod } from './recurring-transaction.js';
import type { RecurrencePeriod as DomainRecurrencePeriod } from './recurring-transaction.js';

const recurrencePeriodToBudgetPeriod: Record<
  DomainRecurrencePeriod,
  'weekly' | 'monthly' | 'yearly'
> = {
  [RecurrencePeriod.Week]: 'weekly',
  [RecurrencePeriod.Month]: 'monthly',
  [RecurrencePeriod.Year]: 'yearly',
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateKey(date: Date): string {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

function recurrenceInstanceAtIndex(
  startDate: Date,
  period: DomainRecurrencePeriod,
  interval: number,
  index: number
): Date {
  return anchoredPeriodBoundsAt(startDate, recurrencePeriodToBudgetPeriod[period], index * interval)
    .start;
}

export type DueRecurringTransactionInstancesInput = {
  /** The schedule's first Transaction Instance date. */
  startDate: Date;
  /** Week / month / year. */
  period: DomainRecurrencePeriod;
  /** How many periods between instances; must be a positive integer. */
  interval: number;
  /** Generate instances on or before this date (exclusive of the next one). */
  referenceDate: Date;
  /** Dates that have already been materialized into Transactions. */
  generatedDates?: readonly Date[];
  /** Dates the user explicitly skipped. */
  skippedDates?: readonly Date[];
};

/**
 * Returns all due Transaction Instance dates for a Recurring Transaction up
 * to and including `referenceDate`, anchored to `startDate` and excluding
 * already generated and explicitly skipped dates. Instance dates use the same
 * weekday / day-of-month / month-day clamping as budget periods.
 */
export function dueRecurringTransactionInstances({
  startDate,
  period,
  interval,
  referenceDate,
  generatedDates = [],
  skippedDates = [],
}: DueRecurringTransactionInstancesInput): Date[] {
  if (!Number.isInteger(interval) || interval < 1) {
    throw new Error(`Recurrence interval must be a positive integer, got ${interval}`);
  }

  const anchor = startOfUtcDay(startDate);
  const reference = startOfUtcDay(referenceDate);

  if (reference < anchor) {
    return [];
  }

  const generated = new Set(generatedDates.map(dateKey));
  const skipped = new Set(skippedDates.map(dateKey));
  const due: Date[] = [];

  for (let index = 0; ; index += 1) {
    const candidate = startOfUtcDay(recurrenceInstanceAtIndex(anchor, period, interval, index));
    if (candidate > reference) {
      break;
    }
    const key = dateKey(candidate);
    if (!generated.has(key) && !skipped.has(key)) {
      due.push(candidate);
    }
  }

  return due;
}

/**
 * Returns the first Transaction Instance date strictly after `referenceDate`.
 * If the schedule itself starts after `referenceDate`, the start date is returned.
 */
export function nextRecurringTransactionInstanceDateAfter(
  startDate: Date,
  period: DomainRecurrencePeriod,
  interval: number,
  referenceDate: Date
): Date {
  if (!Number.isInteger(interval) || interval < 1) {
    throw new Error(`Recurrence interval must be a positive integer, got ${interval}`);
  }

  const anchor = startOfUtcDay(startDate);
  const reference = startOfUtcDay(referenceDate);

  if (anchor > reference) {
    return anchor;
  }

  for (let index = 0; ; index += 1) {
    const candidate = startOfUtcDay(recurrenceInstanceAtIndex(anchor, period, interval, index));
    if (candidate > reference) {
      return candidate;
    }
  }
}
