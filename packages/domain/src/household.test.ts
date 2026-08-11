import { describe, expect, it } from 'vitest';
import { createHousehold } from './household.js';
import { makeHouseholdId } from './ids.js';
import { expectError, expectValue } from './testing/expect-value.js';

describe('createHousehold', () => {
  it('creates a household with a valid name and currency', () => {
    const household = expectValue(
      createHousehold({
        id: makeHouseholdId('household-1'),
        name: 'Home',
        reportingCurrency: 'MXN',
      })
    );

    expect(household.name).toBe('Home');
    expect(household.reportingCurrency).toBe('MXN');
  });

  it('rejects an empty name', () => {
    const error = expectError(
      createHousehold({
        id: makeHouseholdId('household-1'),
        name: '   ',
        reportingCurrency: 'USD',
      })
    );

    expect(error.type).toBe('empty-name');
  });

  it('rejects an unsupported currency', () => {
    const error = expectError(
      createHousehold({
        id: makeHouseholdId('household-1'),
        name: 'Home',
        reportingCurrency: 'XYZ',
      })
    );

    expect(error.type).toBe('invalid-currency');
  });
});
