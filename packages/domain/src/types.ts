import type { CurrencyCode } from './currencies.js';

/**
 * Describes why a Money operation failed.
 */
export type MoneyError =
  | { type: 'currency-mismatch'; left: CurrencyCode; right: CurrencyCode }
  | { type: 'invalid-decimal'; value: string; reason: string }
  | { type: 'unsupported-currency'; currency: string }
  | { type: 'divide-by-zero' };

/**
 * A typed result: either a successful value or an error.
 */
export type Result<T, E = MoneyError> = { ok: true; value: T } | { ok: false; error: E };

/**
 * A value that can be used as a factor or divisor in Money multiplication
 * and division, either as a decimal string (e.g. "1.5") or a bigint.
 */
export type MoneyFactor = string | bigint;

/**
 * A quantity of Money in a specific Currency. All arithmetic is exact
 * integer math; same-currency operations are the default and cross-currency
 * conversion is out of scope.
 */
export type Money = {
  /** The ISO 4217 currency code this Money is denominated in. */
  readonly currency: CurrencyCode;

  /** Returns the value as a decimal string formatted to the currency scale. */
  toDecimal: () => string;

  /** Adds two Money values. Returns a currency-mismatch error if the currencies differ. */
  add: (other: Money) => Result<Money>;

  /** Subtracts one Money value from another. Returns a currency-mismatch error if the currencies differ. */
  subtract: (other: Money) => Result<Money>;

  /**
   * Multiplies this Money by a factor. The result is rounded to the currency
   * scale using half-up rounding. Returns an invalid-decimal error if the factor
   * is malformed.
   */
  multiply: (factor: MoneyFactor) => Result<Money>;

  /**
   * Divides this Money by a divisor. The result is rounded to the currency
   * scale using half-up rounding. Returns an invalid-decimal error if the
   * divisor is malformed, or a divide-by-zero error if the divisor is zero.
   */
  divide: (divisor: MoneyFactor) => Result<Money>;

  /**
   * Splits this Money into shares according to the given ratios. The sum of the
   * returned shares equals the original amount.
   */
  allocate: (ratios: readonly bigint[]) => Money[];

  /** Compares two Money values. Returns a currency-mismatch error if the currencies differ. */
  compare: (other: Money) => Result<Comparison>;

  /** Returns true only if the amounts and currencies are both identical. */
  equals: (other: Money) => boolean;

  /** Returns true if the amount is exactly zero. */
  isZero: () => boolean;

  /** Returns true if the amount is negative. */
  isNegative: () => boolean;

  /** Returns true if the amount is positive. */
  isPositive: () => boolean;
};

type Comparison = -1 | 0 | 1;

export type { Comparison };
