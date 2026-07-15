import type { HouseholdId, HouseholdMembershipId, UserId } from './ids.js';
import type { Result } from './types.js';
import { createTimestamps } from './timestamps.js';

export const HouseholdMembershipRole = {
  Owner: 'OWNER',
  Member: 'MEMBER',
} as const;

export type HouseholdMembershipRole =
  (typeof HouseholdMembershipRole)[keyof typeof HouseholdMembershipRole];

/**
 * Links a User to a Household with a membership role.
 */
export type HouseholdMembership = {
  readonly id: HouseholdMembershipId;
  readonly householdId: HouseholdId;
  readonly userId: UserId;
  readonly role: HouseholdMembershipRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type HouseholdMembershipError = { type: 'invalid-role'; role: string };

function isHouseholdMembershipRole(role: string): role is HouseholdMembershipRole {
  return Object.values(HouseholdMembershipRole).includes(role as HouseholdMembershipRole);
}

/**
 * Creates a HouseholdMembership value object, validating the role.
 */
export function createHouseholdMembership(params: {
  id: HouseholdMembershipId;
  householdId: HouseholdId;
  userId: UserId;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}): Result<HouseholdMembership, HouseholdMembershipError> {
  if (!isHouseholdMembershipRole(params.role)) {
    return { ok: false, error: { type: 'invalid-role', role: params.role } };
  }

  return {
    ok: true,
    value: {
      id: params.id,
      householdId: params.householdId,
      userId: params.userId,
      role: params.role,
      ...createTimestamps({ createdAt: params.createdAt, updatedAt: params.updatedAt }),
    },
  };
}
