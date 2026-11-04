import { describe, expect, it } from 'vitest';

import { createRecurringTransaction, RecurrencePeriod } from './recurring-transaction.js';
import {
  makeAccountId,
  makeCategoryId,
  makeHouseholdId,
  makeRecurringTransactionId,
} from './ids.js';

const validParams = {
  id: makeRecurringTransactionId('f6a7b8c9-d0e1-2345-fabc-456789012345'),
  householdId: makeHouseholdId('b2c3d4e5-f6a7-8901-bcde-f12345678901'),
  accountId: makeAccountId('c3d4e5f6-a7b8-9012-cdef-123456789012'),
  categoryId: makeCategoryId('a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  type: 'expense',
  amountMinorUnits: 4250n,
  startDate: new Date('2026-01-15T00:00:00.000Z'),
  period: RecurrencePeriod.Month,
  interval: 1,
};

describe('createRecurringTransaction', () => {
  it('creates a valid Recurring Transaction', () => {
    const result = createRecurringTransaction(validParams);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toMatchObject({
      id: validParams.id,
      householdId: validParams.householdId,
      accountId: validParams.accountId,
      categoryId: validParams.categoryId,
      type: 'expense',
      amountMinorUnits: 4250n,
      startDate: validParams.startDate,
      period: RecurrencePeriod.Month,
      interval: 1,
      description: '',
    });
    expect(result.value.createdAt).toBeInstanceOf(Date);
    expect(result.value.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects an invalid transaction type', () => {
    const result = createRecurringTransaction({ ...validParams, type: 'transfer' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid-type');
    }
  });

  it('rejects an invalid recurrence period', () => {
    const result = createRecurringTransaction({ ...validParams, period: 'daily' as 'week' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid-period');
    }
  });

  it('rejects a non-positive interval', () => {
    const result = createRecurringTransaction({ ...validParams, interval: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid-interval');
    }
  });

  it('rejects a non-integer interval', () => {
    const result = createRecurringTransaction({ ...validParams, interval: 1.5 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid-interval');
    }
  });

  it('rejects a non-positive amount', () => {
    const result = createRecurringTransaction({ ...validParams, amountMinorUnits: 0n });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('non-positive-amount');
    }
  });

  it('rejects an invalid start date', () => {
    const result = createRecurringTransaction({ ...validParams, startDate: new Date('invalid') });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid-start-date');
    }
  });

  it('includes the provided description', () => {
    const result = createRecurringTransaction({ ...validParams, description: 'Monthly rent' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.description).toBe('Monthly rent');
  });

  it('uses provided timestamps when given', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const result = createRecurringTransaction({ ...validParams, createdAt, updatedAt });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.createdAt).toEqual(createdAt);
    expect(result.value.updatedAt).toEqual(updatedAt);
  });
});

describe('isRecurrencePeriod', () => {
  it('returns true for valid periods', () => {
    expect(RecurrencePeriod.Week).toBe('week');
    expect(RecurrencePeriod.Month).toBe('month');
    expect(RecurrencePeriod.Year).toBe('year');
  });
});
