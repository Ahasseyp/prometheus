import { describe, expect, it } from 'vitest';
import { createHouseholdMembership, HouseholdMembershipRole } from './household-membership.js';
import { makeHouseholdId, makeHouseholdMembershipId, makeUserId } from './ids.js';

describe('createHouseholdMembership', () => {
  it('creates an owner membership', () => {
    const result = createHouseholdMembership({
      id: makeHouseholdMembershipId('membership-1'),
      householdId: makeHouseholdId('household-1'),
      userId: makeUserId('user-1'),
      role: HouseholdMembershipRole.Owner,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.role).toBe('OWNER');
  });

  it('rejects an unknown role', () => {
    const result = createHouseholdMembership({
      id: makeHouseholdMembershipId('membership-1'),
      householdId: makeHouseholdId('household-1'),
      userId: makeUserId('user-1'),
      role: 'ADMIN',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.type).toBe('invalid-role');
  });
});
