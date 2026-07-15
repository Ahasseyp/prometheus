import type { CurrencyCode } from './currencies.js';

/**
 * Describes why a Money operation failed.
 */
export type MoneyError =
  | { type: 'currency-mismatch'; left: CurrencyCode; right: CurrencyCode }
  | { type: 'invalid-decimal'; value: string; reason: string }
  | { type: 'unsupported-currency'; currency: string }
  | { type: 'divide-by-zero' };

export type Result<T> = { ok: true; value: T } | { ok: false; error: MoneyError };

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
  readonly currency: CurrencyCode;
  toDecimal: () => string;
  add: (other: Money) => Result<Money>;
  subtract: (other: Money) => Result<Money>;
  multiply: (factor: MoneyFactor) => Result<Money>;
  divide: (divisor: MoneyFactor) => Result<Money>;
  allocate: (ratios: readonly bigint[]) => Money[];
  compare: (other: Money) => Result<Comparison>;
  equals: (other: Money) => boolean;
  isZero: () => boolean;
  isNegative: () => boolean;
  isPositive: () => boolean;
};

type Comparison = -1 | 0 | 1;

export type { Comparison };
