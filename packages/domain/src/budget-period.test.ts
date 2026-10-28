import { describe, expect, it } from 'vitest';
import { periodBoundsFor, shiftPeriod } from './budget-period.js';

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
