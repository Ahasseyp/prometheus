import { describe, expect, it } from 'vitest';

import { RecurrencePeriod } from './recurring-transaction.js';
import { dueRecurringOccurrences, nextRecurringOccurrenceAfter } from './recurrence.js';

const startDate = new Date('2026-01-15T00:00:00.000Z');

function utcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

describe('dueRecurringOccurrences', () => {
  it('returns the start date when it is on the reference date', () => {
    const result = dueRecurringOccurrences({
      startDate,
      period: RecurrencePeriod.Month,
      interval: 1,
      referenceDate: startDate,
    });

    expect(result).toEqual([startDate]);
  });

  it('returns occurrences on or before the reference date for monthly intervals', () => {
    const result = dueRecurringOccurrences({
      startDate,
      period: RecurrencePeriod.Month,
      interval: 1,
      referenceDate: utcDate('2026-04-14'),
    });

    expect(result).toEqual([utcDate('2026-01-15'), utcDate('2026-02-15'), utcDate('2026-03-15')]);
  });

  it('respects intervals greater than one', () => {
    const result = dueRecurringOccurrences({
      startDate,
      period: RecurrencePeriod.Month,
      interval: 2,
      referenceDate: utcDate('2026-05-15'),
    });

    expect(result).toEqual([utcDate('2026-01-15'), utcDate('2026-03-15'), utcDate('2026-05-15')]);
  });

  it('counts weekly periods in seven-day strides from the start date', () => {
    const result = dueRecurringOccurrences({
      startDate: utcDate('2026-01-05'),
      period: RecurrencePeriod.Week,
      interval: 1,
      referenceDate: utcDate('2026-01-19'),
    });

    expect(result).toEqual([utcDate('2026-01-05'), utcDate('2026-01-12'), utcDate('2026-01-19')]);
  });

  it('supports multi-week intervals', () => {
    const result = dueRecurringOccurrences({
      startDate: utcDate('2026-01-05'),
      period: RecurrencePeriod.Week,
      interval: 2,
      referenceDate: utcDate('2026-02-02'),
    });

    expect(result).toEqual([utcDate('2026-01-05'), utcDate('2026-01-19'), utcDate('2026-02-02')]);
  });

  it('clamps monthly occurrences at month end', () => {
    const jan31 = utcDate('2026-01-31');
    const result = dueRecurringOccurrences({
      startDate: jan31,
      period: RecurrencePeriod.Month,
      interval: 1,
      referenceDate: utcDate('2026-04-30'),
    });

    expect(result).toEqual([
      utcDate('2026-01-31'),
      utcDate('2026-02-28'),
      utcDate('2026-03-31'),
      utcDate('2026-04-30'),
    ]);
  });

  it('clamps yearly occurrences in non-leap years', () => {
    const feb29 = utcDate('2024-02-29');
    const result = dueRecurringOccurrences({
      startDate: feb29,
      period: RecurrencePeriod.Year,
      interval: 1,
      referenceDate: utcDate('2027-02-28'),
    });

    expect(result).toEqual([
      utcDate('2024-02-29'),
      utcDate('2025-02-28'),
      utcDate('2026-02-28'),
      utcDate('2027-02-28'),
    ]);
  });

  it('returns nothing when the reference date is before the start date', () => {
    const result = dueRecurringOccurrences({
      startDate,
      period: RecurrencePeriod.Month,
      interval: 1,
      referenceDate: utcDate('2026-01-14'),
    });

    expect(result).toEqual([]);
  });

  it('excludes already generated dates', () => {
    const result = dueRecurringOccurrences({
      startDate,
      period: RecurrencePeriod.Month,
      interval: 1,
      referenceDate: utcDate('2026-03-15'),
      generatedDates: [utcDate('2026-02-15')],
    });

    expect(result).toEqual([utcDate('2026-01-15'), utcDate('2026-03-15')]);
  });

  it('excludes skipped dates', () => {
    const result = dueRecurringOccurrences({
      startDate,
      period: RecurrencePeriod.Month,
      interval: 1,
      referenceDate: utcDate('2026-03-15'),
      skippedDates: [utcDate('2026-02-15')],
    });

    expect(result).toEqual([utcDate('2026-01-15'), utcDate('2026-03-15')]);
  });

  it('throws when the interval is not a positive integer', () => {
    expect(() =>
      dueRecurringOccurrences({
        startDate,
        period: RecurrencePeriod.Month,
        interval: 0,
        referenceDate: startDate,
      })
    ).toThrow('Recurrence interval must be a positive integer');
  });
});

describe('nextRecurringOccurrenceAfter', () => {
  it('returns the start date when it is after the reference date', () => {
    const result = nextRecurringOccurrenceAfter(
      startDate,
      RecurrencePeriod.Month,
      1,
      utcDate('2026-01-14')
    );

    expect(result).toEqual(startDate);
  });

  it('returns the first occurrence strictly after the reference date', () => {
    const result = nextRecurringOccurrenceAfter(
      startDate,
      RecurrencePeriod.Month,
      1,
      utcDate('2026-01-15')
    );

    expect(result).toEqual(utcDate('2026-02-15'));
  });

  it('uses the interval when advancing past the reference date', () => {
    const result = nextRecurringOccurrenceAfter(
      startDate,
      RecurrencePeriod.Month,
      2,
      utcDate('2026-02-15')
    );

    expect(result).toEqual(utcDate('2026-03-15'));
  });

  it('clamps monthly results at month end', () => {
    const result = nextRecurringOccurrenceAfter(
      utcDate('2026-01-31'),
      RecurrencePeriod.Month,
      1,
      utcDate('2026-01-31')
    );

    expect(result).toEqual(utcDate('2026-02-28'));
  });

  it('throws when the interval is not a positive integer', () => {
    expect(() =>
      nextRecurringOccurrenceAfter(startDate, RecurrencePeriod.Month, 1.5, utcDate('2026-01-14'))
    ).toThrow('Recurrence interval must be a positive integer');
  });
});
