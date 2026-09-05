import { AccountType } from '@prometheus/domain';

import { getCurrencyExponent } from './format-money.js';
import { decimalStringToMinorUnits } from './money-parser.js';

export type AccountBalanceInput = {
  balance: string;
  currency: string;
  type: AccountType;
};

export type CurrencyTotal = {
  currency: string;
  minorUnits: bigint;
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

/**
 * Sums account balances per currency. Totals are never mixed across
 * currencies; each currency gets its own total.
 *
 * TODO: Move this aggregation to the backend. Once issue #57 (Accounts summary
 * on Overview) adds a real overview query, it should return pre-computed totals
 * instead of forcing the frontend to sum decimal-string balances. Multi-currency
 * net-worth conversion belongs to issue #25 (Exchange rates + multi-currency
 * reporting).
 */
export function sumAccountTotals(accounts: AccountBalanceInput[]): CurrencyTotal[] {
  const totalsByCurrency = new Map<string, bigint>();

  for (const account of accounts) {
    const signed = signedMinorUnits(account);
    const currentTotal = totalsByCurrency.get(account.currency) ?? 0n;
    totalsByCurrency.set(account.currency, currentTotal + signed);
  }

  return [...totalsByCurrency.entries()].map(([currency, minorUnits]) => ({
    currency,
    minorUnits,
  }));
}
