import {
  add as dineroAdd,
  allocate as dineroAllocate,
  compare as dineroCompare,
  dinero,
  equal as dineroEqual,
  halfUp,
  isNegative as dineroIsNegative,
  isPositive as dineroIsPositive,
  isZero as dineroIsZero,
  multiply as dineroMultiply,
  subtract as dineroSubtract,
  toDecimal,
  toSnapshot,
  transformScale,
  type Dinero,
  type DineroCurrency,
} from 'dinero.js/bigint';

import { CurrencyCode, currencyFor } from './currencies.js';
import type { Money, MoneyFactor, Result } from './types.js';

const moneyRegistry = new WeakMap<Money, Dinero<bigint>>();

function unwrap(money: Money): Dinero<bigint> {
  const dineroObject = moneyRegistry.get(money);
  if (dineroObject == null) {
    throw new Error('Cannot unwrap a Money value that was not created by this package');
  }
  return dineroObject;
}

function currencyMismatchError(left: CurrencyCode, right: CurrencyCode): Result<never> {
  return { ok: false, error: { type: 'currency-mismatch', left, right } };
}

function invalidDecimalError(value: string, reason: string): Result<never> {
  return { ok: false, error: { type: 'invalid-decimal', value, reason } };
}

function splitDecimal(decimal: string): Result<{ sign: string; whole: string; fraction: string }> {
  const trimmed = decimal.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return invalidDecimalError(decimal, 'must be a valid decimal string');
  }

  const [wholePart = '0', fractionPart = ''] = trimmed.split('.');
  const sign = wholePart.startsWith('-') ? '-' : '';
  const whole = wholePart.replace('-', '');
  return { ok: true, value: { sign, whole, fraction: fractionPart } };
}

function decimalToMinorUnits(decimal: string, scale: number): Result<bigint> {
  const partsResult = splitDecimal(decimal);
  if (!partsResult.ok) {
    return partsResult;
  }
  const { sign, whole, fraction } = partsResult.value;
  if (fraction.length > scale) {
    return invalidDecimalError(decimal, `cannot exceed ${scale} decimal places for this currency`);
  }
  const paddedFraction = fraction.padEnd(scale, '0');
  return { ok: true, value: BigInt(`${sign}${whole}${paddedFraction}`) };
}

type ScaledDecimal = {
  amount: bigint;
  scale: bigint;
};

function parseFactor(value: MoneyFactor): Result<ScaledDecimal> {
  const asString = typeof value === 'bigint' ? value.toString() : value;
  const partsResult = splitDecimal(asString);
  if (!partsResult.ok) {
    return invalidDecimalError(asString, 'must be a valid decimal string or bigint');
  }
  const { sign, whole, fraction } = partsResult.value;
  return {
    ok: true,
    value: {
      amount: BigInt(`${sign}${whole}${fraction}`),
      scale: BigInt(fraction.length),
    },
  };
}

function powerOfTen(exponent: bigint): bigint {
  return 10n ** exponent;
}

function divideWithHalfUp(numerator: bigint, divisor: bigint): bigint {
  const quotient = numerator / divisor;
  const remainder = numerator % divisor;
  const absoluteRemainderDoubled = remainder < 0n ? -remainder * 2n : remainder * 2n;
  const absoluteDivisor = divisor < 0n ? -divisor : divisor;
  if (absoluteRemainderDoubled >= absoluteDivisor) {
    const quotientIsNegative = numerator < 0n !== divisor < 0n;
    return quotientIsNegative ? quotient - 1n : quotient + 1n;
  }
  return quotient;
}

function divideMinorUnits(minorUnits: bigint, divisor: ScaledDecimal): bigint {
  const numerator = minorUnits * powerOfTen(divisor.scale);
  return divideWithHalfUp(numerator, divisor.amount);
}

function createDineroFromMinorUnits(
  minorUnits: bigint,
  currency: DineroCurrency<bigint, CurrencyCode>,
  scale: bigint
): Dinero<bigint> {
  return dinero({ amount: minorUnits, currency, scale });
}

function applyBinaryOperation(
  leftCurrency: CurrencyCode,
  leftDinero: Dinero<bigint>,
  right: Money,
  operation: (left: Dinero<bigint>, right: Dinero<bigint>) => Dinero<bigint>
): Result<Money> {
  if (leftCurrency !== right.currency) {
    return currencyMismatchError(leftCurrency, right.currency);
  }
  return {
    ok: true,
    value: wrapDinero(operation(leftDinero, unwrap(right)), leftCurrency),
  };
}

function wrapDinero(dineroObject: Dinero<bigint>, currency: CurrencyCode): Money {
  const money: Money = {
    currency,
    toDecimal: () => toDecimal(dineroObject),
    add: (other) => applyBinaryOperation(currency, dineroObject, other, dineroAdd),
    subtract: (other) => applyBinaryOperation(currency, dineroObject, other, dineroSubtract),
    multiply: (factor) => {
      const scaledFactorResult = parseFactor(factor);
      if (!scaledFactorResult.ok) {
        return scaledFactorResult;
      }
      const scaledFactor = scaledFactorResult.value;
      const multiplied = dineroMultiply(dineroObject, {
        amount: scaledFactor.amount,
        scale: scaledFactor.scale,
      });
      const rounded = transformScale(multiplied, toSnapshot(dineroObject).scale, halfUp);
      return { ok: true, value: wrapDinero(rounded, currency) };
    },
    divide: (divisor) => {
      const scaledDivisorResult = parseFactor(divisor);
      if (!scaledDivisorResult.ok) {
        return scaledDivisorResult;
      }
      const scaledDivisor = scaledDivisorResult.value;
      if (scaledDivisor.amount === 0n) {
        return { ok: false, error: { type: 'divide-by-zero' } };
      }
      const snapshot = toSnapshot(dineroObject);
      const resultMinorUnits = divideMinorUnits(snapshot.amount, scaledDivisor);
      const resultDinero = dinero({
        amount: resultMinorUnits,
        currency: snapshot.currency,
        scale: snapshot.scale,
      });
      return { ok: true, value: wrapDinero(resultDinero, currency) };
    },
    allocate: (ratios) =>
      dineroAllocate(dineroObject, ratios).map((share) => wrapDinero(share, currency)),
    compare: (other) => {
      if (currency !== other.currency) {
        return currencyMismatchError(currency, other.currency);
      }
      return {
        ok: true,
        value: dineroCompare(dineroObject, unwrap(other)) as 1 | 0 | -1,
      };
    },
    equals: (other) => {
      return currency === other.currency && dineroEqual(dineroObject, unwrap(other));
    },
    isZero: () => dineroIsZero(dineroObject),
    isNegative: () => dineroIsNegative(dineroObject),
    isPositive: () => dineroIsPositive(dineroObject),
  };
  moneyRegistry.set(money, dineroObject);
  return money;
}

/**
 * Creates a Money value from a decimal string and an ISO 4217 currency code.
 * The decimal must not have more fractional digits than the currency allows.
 */
export function createMoney(decimal: string, currencyCode: CurrencyCode): Result<Money> {
  const currency = currencyFor(currencyCode);
  if (currency == null) {
    return { ok: false, error: { type: 'unsupported-currency', currency: currencyCode } };
  }
  const scale = currency.exponent;
  const minorUnitsResult = decimalToMinorUnits(decimal, Number(scale));
  if (!minorUnitsResult.ok) {
    return minorUnitsResult;
  }
  const dineroObject = createDineroFromMinorUnits(minorUnitsResult.value, currency, scale);
  const money = wrapDinero(dineroObject, currencyCode);
  return { ok: true, value: money };
}
