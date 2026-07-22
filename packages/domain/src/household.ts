import type { CurrencyCode } from './currencies.js';
import { isCurrencyCode } from './currencies.js';
import type { HouseholdId } from './ids.js';
import type { Result } from './types.js';
import { createTimestamps } from './timestamps.js';

/**
 * A group of Users that share access to a set of Accounts, transactions,
 * budgets, and goals; the unit of multi-user collaboration.
 */
export type Household = {
  readonly id: HouseholdId;
  readonly name: string;
  readonly reportingCurrency: CurrencyCode;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type HouseholdError =
  { type: 'empty-name' } | { type: 'invalid-currency'; currency: string };

/**
 * Creates a Household value object, validating the name and reporting currency.
 */
export function createHousehold(params: {
  id: HouseholdId;
  name: string;
  reportingCurrency: string;
  createdAt?: Date;
  updatedAt?: Date;
}): Result<Household, HouseholdError> {
  const trimmedName = params.name.trim();
  if (trimmedName === '') {
    return { ok: false, error: { type: 'empty-name' } };
  }

  if (!isCurrencyCode(params.reportingCurrency)) {
    return {
      ok: false,
      error: { type: 'invalid-currency', currency: params.reportingCurrency },
    };
  }

  return {
    ok: true,
    value: {
      id: params.id,
      name: trimmedName,
      reportingCurrency: params.reportingCurrency,
      ...createTimestamps({ createdAt: params.createdAt, updatedAt: params.updatedAt }),
    },
  };
}
