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

function getSignedMinorUnits(account: AccountBalanceInput): bigint {
  const exponent = getCurrencyExponent(account.currency);
  const minorUnits = toMinorUnits(account.balance, exponent);

  // Loans are debts: they reduce net worth, so their balance is subtracted
  // from totals (issue #23).
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
    const signedMinorUnits = getSignedMinorUnits(account);
    const currentTotal = totalsByCurrency.get(account.currency) ?? 0n;
    totalsByCurrency.set(account.currency, currentTotal + signedMinorUnits);
  }

  return [...totalsByCurrency.entries()].map(([currency, minorUnits]) => ({
    currency,
    minorUnits,
  }));
}
