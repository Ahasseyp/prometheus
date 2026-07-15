declare const __brand: unique symbol;

type Brand<T, B> = T & { readonly [__brand]: B };

/** A UUID that identifies a User. */
export type UserId = Brand<string, 'UserId'>;

/** A UUID that identifies a Household. */
export type HouseholdId = Brand<string, 'HouseholdId'>;

/** A UUID that identifies a HouseholdMembership. */
export type HouseholdMembershipId = Brand<string, 'HouseholdMembershipId'>;

export function makeUserId(value: string): UserId {
  return value as UserId;
}

export function makeHouseholdId(value: string): HouseholdId {
  return value as HouseholdId;
}

export function makeHouseholdMembershipId(value: string): HouseholdMembershipId {
  return value as HouseholdMembershipId;
}
