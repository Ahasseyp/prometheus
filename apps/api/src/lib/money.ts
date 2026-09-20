import { createMoneyFromMinorUnits } from '@prometheus/domain';
import type { CurrencyCode } from '@prometheus/domain';

/**
 * Formats minor units as a decimal string with the currency's exponent
 * (e.g. 1234n with USD -> "12.34").
 */
export function minorUnitsToDecimal(minorUnits: bigint, currencyCode: CurrencyCode): string {
  const result = createMoneyFromMinorUnits(minorUnits, currencyCode);
  if (!result.ok) {
    throw new Error(`Unexpected money conversion failure: ${result.error.type}`);
  }
  return result.value.toDecimal();
}
