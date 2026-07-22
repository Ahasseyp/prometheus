export const USER_ALREADY_HAS_HOUSEHOLD_ERROR = 'user-already-has-household' as const;

export type CreateHouseholdError = typeof USER_ALREADY_HAS_HOUSEHOLD_ERROR;
