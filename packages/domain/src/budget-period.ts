import type { BudgetPeriod } from './budget.js';

export type PeriodBounds = {
  /** First instant of the period, inclusive. */
  start: Date;
  /** First instant after the period, exclusive. */
  end: Date;
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

// Month indices may overflow (month 12) or underflow (month -1); the year
// carries the overflow and the day clamps at the target month end.
function clampedUtcDay(year: number, monthIndex: number, day: number): Date {
  const normalizedYear = year + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  return new Date(
    Date.UTC(normalizedYear, month, Math.min(day, daysInUtcMonth(normalizedYear, month)))
  );
}

/**
 * Returns the period at the given whole-period offset from a Budget's Start
 * Date (offset 0 is the first period), as date-only UTC boundaries. Period
 * boundaries anchor to the Start Date:
 *
 * - weekly periods stride seven days from the Start Date,
 * - monthly periods start on the Start Date's day of month, clamped at the
 *   target month's end,
 * - yearly periods start on the Start Date's month and day, clamped at the
 *   target year's February.
 */
export function anchoredPeriodBoundsAt(
  startDate: Date,
  period: BudgetPeriod,
  index: number
): PeriodBounds {
  const anchor = startOfUtcDay(startDate);

  switch (period) {
    case 'weekly': {
      const start = addDays(anchor, index * 7);
      return { start, end: addDays(start, 7) };
    }
    case 'monthly': {
      const day = anchor.getUTCDate();
      const year = anchor.getUTCFullYear();
      const month = anchor.getUTCMonth();
      return {
        start: clampedUtcDay(year, month + index, day),
        end: clampedUtcDay(year, month + index + 1, day),
      };
    }
    case 'yearly': {
      const year = anchor.getUTCFullYear() + index;
      const month = anchor.getUTCMonth();
      const day = anchor.getUTCDate();
      return {
        start: clampedUtcDay(year, month, day),
        end: clampedUtcDay(year + 1, month, day),
      };
    }
  }
}

/**
 * Returns the anchored period containing the given date. Dates before the
 * Start Date clamp to the first period: a Budget has no activity to measure
 * before its Start Date.
 */
export function anchoredPeriodFor(startDate: Date, date: Date, period: BudgetPeriod): PeriodBounds {
  const day = startOfUtcDay(date);
  const anchor = startOfUtcDay(startDate);

  let index: number;
  if (period === 'weekly') {
    index = Math.floor((day.getTime() - anchor.getTime()) / (7 * 86_400_000));
  } else if (period === 'monthly') {
    index =
      (day.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
      (day.getUTCMonth() - anchor.getUTCMonth());
    if (anchoredPeriodBoundsAt(startDate, period, index).start.getTime() > day.getTime()) {
      index -= 1;
    }
  } else {
    index = day.getUTCFullYear() - anchor.getUTCFullYear();
    if (anchoredPeriodBoundsAt(startDate, period, index).start.getTime() > day.getTime()) {
      index -= 1;
    }
  }

  return anchoredPeriodBoundsAt(startDate, period, Math.max(0, index));
}
