import { createMoneyFromMinorUnits } from '@prometheus/domain';
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
