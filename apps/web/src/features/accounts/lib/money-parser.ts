/**
 * Parses a decimal-string balance into integer minor units as a bigint.
 *
 * This helper lives in the web app rather than `@prometheus/domain` because it
 * is a presentation-layer concern: it converts the API's decimal-string balances
 * into the minor-unit representation that Dinero.js expects for display and
 * summation. The domain package's `createMoney` returns a full Money object
 * suited for arithmetic; when we only need minor units for grouping or
 * formatting, a lightweight parser keeps the contract smaller.
 */
export function decimalStringToMinorUnits(decimal: string, exponent: number): bigint {
  const trimmed = decimal.trim();
  const isNegative = trimmed.startsWith('-');
  const unsigned = trimmed.replace('-', '');
  const [whole = '0', fraction = ''] = unsigned.split('.');
  const paddedFraction = fraction.padEnd(exponent, '0').slice(0, exponent);
  const unsignedMinor = BigInt(`${whole}${paddedFraction}`);
  return isNegative ? -unsignedMinor : unsignedMinor;
}
