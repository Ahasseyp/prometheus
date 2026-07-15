import { describe, expect, it } from 'vitest';
import {
  createHousehold,
  createHouseholdMembership,
  createMoney,
  createUser,
  HouseholdMembershipRole,
} from './index.js';
import { makeHouseholdId, makeHouseholdMembershipId, makeUserId } from './ids.js';

describe('packages/domain exports', () => {
  it('exports the Money factory from the package entry point', () => {
    const result = createMoney('1.00', 'USD');
    expect(result.ok).toBe(true);
  });

  it('exports the User factory from the package entry point', () => {
    const result = createUser({
      id: makeUserId('user-1'),
      email: 'alice@example.com',
    });
    expect(result.ok).toBe(true);
  });

  it('exports the Household factory from the package entry point', () => {
    const result = createHousehold({
      id: makeHouseholdId('household-1'),
      name: 'Home',
      reportingCurrency: 'MXN',
    });
    expect(result.ok).toBe(true);
  });

  it('exports the HouseholdMembership factory and role from the package entry point', () => {
    const result = createHouseholdMembership({
      id: makeHouseholdMembershipId('membership-1'),
      householdId: makeHouseholdId('household-1'),
      userId: makeUserId('user-1'),
      role: HouseholdMembershipRole.Owner,
    });
    expect(result.ok).toBe(true);
  });
});
