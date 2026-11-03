import { describe, expect, it } from 'vitest';
import { anchoredPeriodBoundsAt, anchoredPeriodFor } from './budget-period.js';

const at = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('anchoredPeriodBoundsAt', () => {
  it('counts weekly periods from the start date in seven-day strides', () => {
    const start = at('2026-10-14'); // a Wednesday
    expect(anchoredPeriodBoundsAt(start, 'weekly', 0)).toEqual({
      start: at('2026-10-14'),
      end: at('2026-10-21'),
    });
    expect(anchoredPeriodBoundsAt(start, 'weekly', 2)).toEqual({
      start: at('2026-10-28'),
      end: at('2026-11-04'),
    });
    expect(anchoredPeriodBoundsAt(start, 'weekly', -1)).toEqual({
      start: at('2026-10-07'),
      end: at('2026-10-14'),
    });
  });

  it('counts monthly periods on the start day, clamped at month end', () => {
    const start = at('2026-01-31');
    expect(anchoredPeriodBoundsAt(start, 'monthly', 0)).toEqual({
      start: at('2026-01-31'),
      end: at('2026-02-28'),
    });
    expect(anchoredPeriodBoundsAt(start, 'monthly', 1)).toEqual({
      start: at('2026-02-28'),
      end: at('2026-03-31'),
    });
    expect(anchoredPeriodBoundsAt(start, 'monthly', 2)).toEqual({
      start: at('2026-03-31'),
      end: at('2026-04-30'),
    });
  });

  it('counts yearly periods on the start month and day, clamped in non-leap years', () => {
    const start = at('2024-02-29');
    expect(anchoredPeriodBoundsAt(start, 'yearly', 0)).toEqual({
      start: at('2024-02-29'),
      end: at('2025-02-28'),
    });
    expect(anchoredPeriodBoundsAt(start, 'yearly', 2)).toEqual({
      start: at('2026-02-28'),
      end: at('2027-02-28'),
    });
  });
});

describe('anchoredPeriodFor', () => {
  it('finds the anchored period containing a date', () => {
    const start = at('2026-09-15');
    expect(anchoredPeriodFor(start, at('2026-10-20'), 'monthly')).toEqual({
      start: at('2026-10-15'),
      end: at('2026-11-15'),
    });
    expect(anchoredPeriodFor(start, at('2026-10-15'), 'monthly').start).toEqual(at('2026-10-15'));
    expect(anchoredPeriodFor(start, at('2026-10-14'), 'monthly').start).toEqual(at('2026-09-15'));
  });

  it('finds weekly periods across the anchor weekday', () => {
    const start = at('2026-10-14'); // Wednesday
    expect(anchoredPeriodFor(start, at('2026-10-14'), 'weekly').start).toEqual(at('2026-10-14'));
    expect(anchoredPeriodFor(start, at('2026-10-20'), 'weekly').start).toEqual(at('2026-10-14'));
    expect(anchoredPeriodFor(start, at('2026-10-21'), 'weekly').start).toEqual(at('2026-10-21'));
  });

  it('clamps dates before the start date to the first period', () => {
    const start = at('2026-09-15');
    expect(anchoredPeriodFor(start, at('2026-09-01'), 'monthly').start).toEqual(at('2026-09-15'));
  });
});
