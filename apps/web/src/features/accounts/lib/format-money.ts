import { dinero, toDecimal } from 'dinero.js/bigint';
import { currencyFor } from '@prometheus/domain';

import { decimalStringToMinorUnits } from './money-parser.js';

function getLocale(): string {
  return typeof navigator !== 'undefined' ? navigator.language : 'en-US';
}

function createMoneyFormatter(currency: string): Intl.NumberFormat {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency,
    // The currency code must always be visible next to money (DESIGN.md).
    currencyDisplay: 'code',
  });
}

/**
 * Returns the number of minor units per major unit for a currency, as a base-10
 * exponent (USD → 2, JPY → 0). Derived from ICU so zero-decimal currencies are
 * handled correctly.
 */
export function getCurrencyExponent(currency: string): number {
  const resolved = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions();
  return resolved.maximumFractionDigits ?? 2;
}

function formatDineroDecimal(decimal: string, currency: string): string {
  // `toDecimal` returns an exact decimal string; we convert to Number only for
  // Intl.NumberFormat's display formatter, not for money arithmetic.
  return createMoneyFormatter(currency).format(Number(decimal));
}

/**
 * Formats a decimal-string balance (e.g. "-1240.50") in its own currency.
 * Arithmetic on balances goes through minor units; this function only formats
 * the final value for display.
 */
export function formatMoney(balance: string, currency: string): string {
  const currencyObject = currencyFor(currency);
  if (currencyObject == null) {
    return balance;
  }

  const exponent = getCurrencyExponent(currency);
  const minorUnits = decimalStringToMinorUnits(balance, exponent);
  const money = dinero({ amount: minorUnits, currency: currencyObject });
  return formatDineroDecimal(toDecimal(money), currency);
}

/**
 * Formats an integer amount of minor units (e.g. 1050 → "USD 10.50") without
 * using floating-point money math.
 */
export function formatMinorUnits(minorUnits: bigint | number, currency: string): string {
  const currencyObject = currencyFor(currency);
  if (currencyObject == null) {
    return `${minorUnits} ${currency}`;
  }

  const money = dinero({ amount: BigInt(minorUnits), currency: currencyObject });
  return formatDineroDecimal(toDecimal(money), currency);
}
