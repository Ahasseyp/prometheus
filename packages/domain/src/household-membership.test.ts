import { describe, expect, it } from 'vitest';
import { createHouseholdMembership, HouseholdMembershipRole } from './household-membership.js';
import { makeHouseholdId, makeHouseholdMembershipId, makeUserId } from './ids.js';
import { expectError, expectValue } from './testing/expect-value.js';

describe('createHouseholdMembership', () => {
  it('creates an owner membership', () => {
    const membership = expectValue(
      createHouseholdMembership({
        id: makeHouseholdMembershipId('membership-1'),
        householdId: makeHouseholdId('household-1'),
        userId: makeUserId('user-1'),
        role: HouseholdMembershipRole.Owner,
      })
    );

    expect(membership.role).toBe('OWNER');
  });

  it('rejects an unknown role', () => {
    const error = expectError(
      createHouseholdMembership({
        id: makeHouseholdMembershipId('membership-1'),
        householdId: makeHouseholdId('household-1'),
        userId: makeUserId('user-1'),
        role: 'ADMIN',
      })
    );

    expect(error.type).toBe('invalid-role');
  });
});
