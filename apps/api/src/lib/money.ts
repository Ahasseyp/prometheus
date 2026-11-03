import { createMoney, createMoneyFromMinorUnits } from '@prometheus/domain';
import type { CurrencyCode, Money, Result } from '@prometheus/domain';

/**
 * Formats minor units as a decimal string with the currency's exponent
 * (e.g. 1234n with USD -> "12.34").
 */
export function minorUnitsToDecimal(minorUnits: bigint, currencyCode: CurrencyCode): string {
  return expectMoney(createMoneyFromMinorUnits(minorUnits, currencyCode)).toDecimal();
}

/** Unwraps a Money Result that cannot fail on a validated code path. */
export function expectMoney(result: Result<Money>): Money {
  if (!result.ok) {
    throw new Error(`Unexpected money conversion failure: ${result.error.type}`);
  }
  return result.value;
}

/**
 * Parses a positive decimal amount into minor units for the given currency.
 * Returns { ok: false } when the decimal is invalid, exceeds the currency
 * exponent, or is not positive. Throws when the currency code is unsupported;
 * callers should validate the account exists first. Used by Transaction,
 * Transfer, and Recurring Transaction creation paths.
 */
export function parseAmountToMinorUnits(
  amount: string,
  accountCurrency: string
): { ok: true; minorUnits: bigint } | { ok: false } {
  const moneyResult = createMoney(amount.trim(), accountCurrency as CurrencyCode);
  if (!moneyResult.ok) {
    if (moneyResult.error.type === 'unsupported-currency') {
      throw new Error(`Unexpected unsupported account currency: ${accountCurrency}`);
    }
    return { ok: false };
  }
  const minorUnits = moneyResult.value.toMinorUnits();
  if (minorUnits <= 0n) {
    return { ok: false };
  }
  return { ok: true, minorUnits };
}
