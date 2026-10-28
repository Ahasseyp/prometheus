import { AccountType } from '@prometheus/domain';

import { getCurrencyExponent } from '@/lib/format-money.js';
import { decimalStringToMinorUnits } from '@/lib/money-parser.js';

export type AccountBalanceInput = {
  balance: string;
  currency: string;
  type: AccountType;
};

/**
 * Converts a decimal-string balance to integer minor units without
 * floating-point math, so sums like 0.10 + 0.20 stay exact.
 */
export function toMinorUnits(balance: string, exponent: number): bigint {
  return decimalStringToMinorUnits(balance, exponent);
}

/**
 * Returns an account's balance in signed minor units. Loans are debts: they
 * reduce net worth, so their balance is negated (issue #23). This is the single
 * home for the loan sign convention — display and totals both derive from it.
 */
export function signedMinorUnits(account: AccountBalanceInput): bigint {
  const exponent = getCurrencyExponent(account.currency);
  const minorUnits = toMinorUnits(account.balance, exponent);

  return account.type === AccountType.Loan ? -minorUnits : minorUnits;
}
