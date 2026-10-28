import type { BudgetPeriod } from './budget.js';

export type PeriodBounds = {
  /** First instant of the period, inclusive. */
  start: Date;
  /** First instant after the period, exclusive. */
  end: Date;
};

/**
 * Returns the calendar period containing the given date, as date-only UTC
 * boundaries. The caller supplies the date it considers "today" in its local
 * calendar (the API boundary), so no timezone handling happens here:
 *
 * - weekly periods start on Monday,
 * - monthly periods start on the first of the calendar month,
 * - yearly periods start on the first of January.
 */
export function periodBoundsFor(date: Date, period: BudgetPeriod): PeriodBounds {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  switch (period) {
    case 'weekly': {
      // GetUTCDay: 0 = Sunday, 1 = Monday, ... 6 = Saturday.
      const daysSinceMonday = (date.getUTCDay() + 6) % 7;
      const start = new Date(Date.UTC(year, month, day - daysSinceMonday));
      return { start, end: addDays(start, 7) };
    }
    case 'monthly': {
      const start = new Date(Date.UTC(year, month, 1));
      return { start, end: new Date(Date.UTC(year, month + 1, 1)) };
    }
    case 'yearly': {
      const start = new Date(Date.UTC(year, 0, 1));
      return { start, end: new Date(Date.UTC(year + 1, 0, 1)) };
    }
  }
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Returns the same calendar period shifted by whole periods (negative offsets
 * move backwards), used to walk consecutive periods for rollover.
 */
export function shiftPeriod(
  bounds: PeriodBounds,
  period: BudgetPeriod,
  offset: number
): PeriodBounds {
  if (offset === 0) {
    return bounds;
  }

  const anchor = new Date(bounds.start);
  anchor.setUTCDate(anchor.getUTCDate() + 1);

  switch (period) {
    case 'weekly':
      anchor.setUTCDate(anchor.getUTCDate() + offset * 7);
      break;
    case 'monthly':
      anchor.setUTCMonth(anchor.getUTCMonth() + offset);
      break;
    case 'yearly':
      anchor.setUTCFullYear(anchor.getUTCFullYear() + offset);
      break;
  }

  return periodBoundsFor(anchor, period);
}
