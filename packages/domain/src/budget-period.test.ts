import { describe, expect, it } from 'vitest';
import {
  periodBoundsFor,
  shiftPeriod,
  anchoredPeriodBoundsAt,
  anchoredPeriodFor,
} from './budget-period.js';

const at = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('periodBoundsFor', () => {
  it('bounds monthly periods on calendar months', () => {
    expect(periodBoundsFor(at('2026-10-15'), 'monthly')).toEqual({
      start: at('2026-10-01'),
      end: at('2026-11-01'),
    });
    expect(periodBoundsFor(at('2026-12-31'), 'monthly')).toEqual({
      start: at('2026-12-01'),
      end: at('2027-01-01'),
    });
  });

  it('bounds yearly periods on calendar years', () => {
    expect(periodBoundsFor(at('2026-06-15'), 'yearly')).toEqual({
      start: at('2026-01-01'),
      end: at('2027-01-01'),
    });
  });

  it('bounds weekly periods as Monday-starting weeks', () => {
    // 2026-10-15 is a Thursday; its week starts Monday 2026-10-12.
    expect(periodBoundsFor(at('2026-10-15'), 'weekly')).toEqual({
      start: at('2026-10-12'),
      end: at('2026-10-19'),
    });
    // A Monday belongs to the week starting on itself.
    expect(periodBoundsFor(at('2026-10-12'), 'weekly')).toEqual({
      start: at('2026-10-12'),
      end: at('2026-10-19'),
    });
    // A Sunday closes the week that started the previous Monday.
    expect(periodBoundsFor(at('2026-10-18'), 'weekly')).toEqual({
      start: at('2026-10-12'),
      end: at('2026-10-19'),
    });
  });
});

describe('shiftPeriod', () => {
  it('shifts monthly periods across month and year boundaries', () => {
    const october = periodBoundsFor(at('2026-10-15'), 'monthly');
    expect(shiftPeriod(october, 'monthly', -1)).toEqual({
      start: at('2026-09-01'),
      end: at('2026-10-01'),
    });
    expect(shiftPeriod(october, 'monthly', -10)).toEqual({
      start: at('2025-12-01'),
      end: at('2026-01-01'),
    });
    expect(shiftPeriod(october, 'monthly', 1)).toEqual({
      start: at('2026-11-01'),
      end: at('2026-12-01'),
    });
  });

  it('shifts weekly and yearly periods by whole periods', () => {
    const week = periodBoundsFor(at('2026-10-15'), 'weekly');
    expect(shiftPeriod(week, 'weekly', -1)).toEqual({
      start: at('2026-10-05'),
      end: at('2026-10-12'),
    });

    const year = periodBoundsFor(at('2026-06-15'), 'yearly');
    expect(shiftPeriod(year, 'yearly', -1)).toEqual({
      start: at('2025-01-01'),
      end: at('2026-01-01'),
    });
  });

  it('round-trips through opposite offsets', () => {
    const bounds = periodBoundsFor(at('2026-03-15'), 'monthly');
    expect(shiftPeriod(shiftPeriod(bounds, 'monthly', 3), 'monthly', -3)).toEqual(bounds);
  });
});

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
