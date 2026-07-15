import { describe, expect, it } from 'vitest';
import { createHousehold } from './household.js';
import { makeHouseholdId } from './ids.js';

describe('createHousehold', () => {
  it('creates a household with a valid name and currency', () => {
    const result = createHousehold({
      id: makeHouseholdId('household-1'),
      name: 'Home',
      reportingCurrency: 'MXN',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.name).toBe('Home');
    expect(result.value.reportingCurrency).toBe('MXN');
  });

  it('rejects an empty name', () => {
    const result = createHousehold({
      id: makeHouseholdId('household-1'),
      name: '   ',
      reportingCurrency: 'USD',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.type).toBe('empty-name');
  });

  it('rejects an unsupported currency', () => {
    const result = createHousehold({
      id: makeHouseholdId('household-1'),
      name: 'Home',
      reportingCurrency: 'XYZ',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.type).toBe('invalid-currency');
  });
});
