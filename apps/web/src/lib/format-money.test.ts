import { describe, expect, it } from 'vitest';

import { formatMinorUnits, formatMoney, getCurrencyExponent } from './format-money.js';

describe('getCurrencyExponent', () => {
  it('returns 2 for two-decimal currencies', () => {
    expect(getCurrencyExponent('USD')).toBe(2);
  });

  it('returns 0 for zero-decimal currencies', () => {
    expect(getCurrencyExponent('JPY')).toBe(0);
    expect(getCurrencyExponent('KRW')).toBe(0);
  });
});

describe('formatMoney', () => {
  it('always shows the currency code next to the amount', () => {
    const formatted = formatMoney('4820.35', 'USD');

    expect(formatted).toContain('USD');
    expect(formatted).toContain('4,820.35');
  });

  it('keeps the minus sign on negative balances', () => {
    const formatted = formatMoney('-1240.50', 'USD');

    expect(formatted).toMatch(/-|−/);
    expect(formatted).toContain('1,240.50');
  });

  it('formats zero-decimal currencies without fraction digits', () => {
    const formatted = formatMoney('1500', 'JPY');

    expect(formatted).toContain('JPY');
    expect(formatted).not.toContain('.');
  });
});

describe('formatMinorUnits', () => {
  it('formats minor units using the currency exponent', () => {
    expect(formatMinorUnits(1050, 'USD')).toContain('10.50');
  });

  it('formats zero-decimal currencies without scaling', () => {
    const formatted = formatMinorUnits(1500, 'JPY');

    expect(formatted).toContain('JPY');
    expect(formatted).toContain('1,500');
    expect(formatted).not.toContain('.');
  });

  it('keeps the minus sign on negative totals', () => {
    expect(formatMinorUnits(-500, 'USD')).toMatch(/-|−/);
  });
});
