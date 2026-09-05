import { isCurrencyCode } from './currencies.js';
import type { AccountId, HouseholdId } from './ids.js';
import type { Result } from './types.js';
import { createTimestamps } from './timestamps.js';

export const AccountType = {
  Checking: 'checking',
  Savings: 'savings',
  CreditCard: 'credit card',
  Cash: 'cash',
  Investment: 'investment',
  Loan: 'loan',
} as const;

export type AccountType = (typeof AccountType)[keyof typeof AccountType];

function isAccountType(value: string): value is AccountType {
  return Object.values(AccountType).includes(value as AccountType);
}

/**
 * A financial container owned by a Household, such as a checking account,
 * credit card, savings account, cash holdings, investment, or loan. Each
 * Account has exactly one Account Currency.
 */
export type Account = {
  readonly id: AccountId;
  readonly householdId: HouseholdId;
  readonly name: string;
  readonly type: AccountType;
  readonly currency: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type AccountError =
  | { type: 'empty-name' }
  | { type: 'invalid-type'; typeValue: string }
  | { type: 'invalid-currency'; currency: string };

/**
 * Creates an Account value object, validating the name, type, and currency.
 */
export function createAccount(params: {
  id: AccountId;
  householdId: HouseholdId;
  name: string;
  type: string;
  currency: string;
  createdAt?: Date;
  updatedAt?: Date;
}): Result<Account, AccountError> {
  const trimmedName = params.name.trim();
  if (trimmedName === '') {
    return { ok: false, error: { type: 'empty-name' } };
  }

  if (!isAccountType(params.type)) {
    return {
      ok: false,
      error: { type: 'invalid-type', typeValue: params.type },
    };
  }

  if (!isCurrencyCode(params.currency)) {
    return {
      ok: false,
      error: { type: 'invalid-currency', currency: params.currency },
    };
  }

  return {
    ok: true,
    value: {
      id: params.id,
      householdId: params.householdId,
      name: trimmedName,
      type: params.type,
      currency: params.currency,
      ...createTimestamps({ createdAt: params.createdAt, updatedAt: params.updatedAt }),
    },
  };
}
