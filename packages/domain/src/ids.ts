declare const __brand: unique symbol;

type Brand<T, B> = T & { readonly [__brand]: B };

/** A UUID that identifies a User. */
export type UserId = Brand<string, 'UserId'>;

/** A UUID that identifies a Household. */
export type HouseholdId = Brand<string, 'HouseholdId'>;

/** A UUID that identifies a HouseholdMembership. */
export type HouseholdMembershipId = Brand<string, 'HouseholdMembershipId'>;

/** A UUID that identifies an Account. */
export type AccountId = Brand<string, 'AccountId'>;

/** A UUID that identifies a Category. */
export type CategoryId = Brand<string, 'CategoryId'>;

/** A UUID that identifies a Transaction. */
export type TransactionId = Brand<string, 'TransactionId'>;

export function makeUserId(value: string): UserId {
  return value as UserId;
}

export function makeHouseholdId(value: string): HouseholdId {
  return value as HouseholdId;
}

export function makeHouseholdMembershipId(value: string): HouseholdMembershipId {
  return value as HouseholdMembershipId;
}

export function makeAccountId(value: string): AccountId {
  return value as AccountId;
}

export function makeCategoryId(value: string): CategoryId {
  return value as CategoryId;
}

export function makeTransactionId(value: string): TransactionId {
  return value as TransactionId;
}
