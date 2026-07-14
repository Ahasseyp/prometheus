import { describe, expect, it } from 'vitest';
import { createMoney, MoneyError } from './money.js';

const usd = (decimal: string) => createMoney(decimal, 'USD');
const eur = (decimal: string) => createMoney(decimal, 'EUR');

const expectValue = <T>(result: { ok: true; value: T } | { ok: false; error: MoneyError }): T => {
  if (!result.ok) {
    throw new Error(`Expected success but got error: ${result.error.type}`);
  }
  return result.value;
};

describe('Money creation', () => {
  it('creates money from a decimal string and exposes its currency', () => {
    const money = expectValue(usd('123.45'));
    expect(money.currency).toBe('USD');
    expect(money.toDecimal()).toBe('123.45');
  });

  it('normalizes integer amounts to the currency scale', () => {
    const money = expectValue(usd('100'));
    expect(money.toDecimal()).toBe('100.00');
  });

  it('rejects malformed decimal strings', () => {
    const result = createMoney('abc', 'USD');
    expect(result.ok).toBe(false);
  });

  it('rejects unsupported currencies', () => {
    const result = createMoney('1.00', 'XYZ' as 'USD');
    expect(result.ok).toBe(false);
  });

  it('rejects decimals with more precision than the currency allows', () => {
    const result = createMoney('1.555', 'USD');
    expect(result.ok).toBe(false);
  });

  it('uses the currency scale for zero-decimal currencies', () => {
    const yen = expectValue(createMoney('100', 'JPY'));
    expect(yen.toDecimal()).toBe('100');
  });
});

describe('Money addition', () => {
  it('adds two amounts in the same currency', () => {
    const sum = expectValue(expectValue(usd('10.50')).add(expectValue(usd('4.25'))));
    expect(sum.toDecimal()).toBe('14.75');
    expect(sum.currency).toBe('USD');
  });

  it('preserves exact decimal results without floating-point drift', () => {
    const sum = expectValue(expectValue(usd('0.10')).add(expectValue(usd('0.20'))));
    expect(sum.toDecimal()).toBe('0.30');
  });

  it('returns a currency mismatch error for different currencies', () => {
    const result = expectValue(usd('10.00')).add(expectValue(eur('5.00')));
    expect(result.ok).toBe(false);
  });
});

describe('Money subtraction', () => {
  it('subtracts two amounts in the same currency', () => {
    const difference = expectValue(expectValue(usd('10.00')).subtract(expectValue(usd('3.50'))));
    expect(difference.toDecimal()).toBe('6.50');
  });

  it('returns a negative result when the subtrahend is larger', () => {
    const difference = expectValue(expectValue(usd('5.00')).subtract(expectValue(usd('10.00'))));
    expect(difference.toDecimal()).toBe('-5.00');
  });

  it('returns a currency mismatch error for different currencies', () => {
    const result = expectValue(usd('10.00')).subtract(expectValue(eur('5.00')));
    expect(result.ok).toBe(false);
  });
});

describe('Money multiplication', () => {
  it('multiplies by a decimal factor', () => {
    const product = expectValue(expectValue(usd('10.00')).multiply('1.5'));
    expect(product.toDecimal()).toBe('15.00');
  });

  it('multiplies by a bigint factor without rounding', () => {
    const product = expectValue(expectValue(usd('10.00')).multiply(2n));
    expect(product.toDecimal()).toBe('20.00');
  });

  it('multiplies by a fractional factor without rounding drift', () => {
    const product = expectValue(expectValue(usd('9.99')).multiply('1.0825'));
    expect(product.toDecimal()).toBe('10.81');
  });

  it('rounds to the currency scale using half-up rounding', () => {
    const product = expectValue(expectValue(usd('10.00')).multiply('0.3333'));
    expect(product.toDecimal()).toBe('3.33');
  });

  it('returns an error for an invalid factor', () => {
    const result = expectValue(usd('10.00')).multiply('abc');
    expect(result.ok).toBe(false);
  });
});

describe('Money division', () => {
  it('divides by a decimal divisor', () => {
    const quotient = expectValue(expectValue(usd('10.00')).divide('4'));
    expect(quotient.toDecimal()).toBe('2.50');
  });

  it('divides by a bigint divisor without rounding', () => {
    const quotient = expectValue(expectValue(usd('10.00')).divide(2n));
    expect(quotient.toDecimal()).toBe('5.00');
  });

  it('rounds to the currency scale using half-up rounding', () => {
    const quotient = expectValue(expectValue(usd('10.00')).divide('3'));
    expect(quotient.toDecimal()).toBe('3.33');
  });

  it('rounds negative amounts away from zero', () => {
    const quotient = expectValue(expectValue(usd('0.05')).divide('-2'));
    expect(quotient.toDecimal()).toBe('-0.03');
  });

  it('returns an error when dividing by zero', () => {
    const result = expectValue(usd('10.00')).divide('0');
    expect(result.ok).toBe(false);
  });

  it('returns an error for an invalid divisor', () => {
    const result = expectValue(usd('10.00')).divide('abc');
    expect(result.ok).toBe(false);
  });
});

describe('Money allocation', () => {
  it('allocates an amount according to ratios', () => {
    const shares = expectValue(usd('10.00')).allocate([1n, 1n]);
    expect(shares.map((share) => share.toDecimal())).toEqual(['5.00', '5.00']);
  });

  it('distributes rounding remainders so the total is preserved', () => {
    const shares = expectValue(usd('10.00')).allocate([1n, 1n, 1n]);
    const partial = expectValue(shares[0].add(shares[1]));
    const total = expectValue(partial.add(shares[2]));
    expect(total.toDecimal()).toBe('10.00');
    expect(shares.map((share) => share.toDecimal())).toEqual(['3.34', '3.33', '3.33']);
  });
});

describe('Money comparison', () => {
  it('returns a positive value when the left amount is greater', () => {
    const comparison = expectValue(expectValue(usd('10.00')).compare(expectValue(usd('5.00'))));
    expect(comparison).toBe(1);
  });

  it('returns zero for equal amounts', () => {
    const comparison = expectValue(expectValue(usd('10.00')).compare(expectValue(usd('10.00'))));
    expect(comparison).toBe(0);
  });

  it('returns a negative value when the left amount is lesser', () => {
    const comparison = expectValue(expectValue(usd('5.00')).compare(expectValue(usd('10.00'))));
    expect(comparison).toBe(-1);
  });

  it('returns a currency mismatch error for different currencies', () => {
    const result = expectValue(usd('10.00')).compare(expectValue(eur('5.00')));
    expect(result.ok).toBe(false);
  });
});

describe('Money equality', () => {
  it('is true for equal amounts and same currency', () => {
    expect(expectValue(usd('10.00')).equals(expectValue(usd('10.00')))).toBe(true);
  });

  it('is false for different amounts', () => {
    expect(expectValue(usd('10.00')).equals(expectValue(usd('10.01')))).toBe(false);
  });

  it('is false for different currencies even with equal amounts', () => {
    expect(expectValue(usd('10.00')).equals(expectValue(eur('10.00')))).toBe(false);
  });
});

describe('Money sign', () => {
  it('detects zero, positive, and negative amounts', () => {
    expect(expectValue(usd('0.00')).isZero()).toBe(true);
    expect(expectValue(usd('1.00')).isPositive()).toBe(true);
    expect(expectValue(usd('-1.00')).isNegative()).toBe(true);
  });
});
