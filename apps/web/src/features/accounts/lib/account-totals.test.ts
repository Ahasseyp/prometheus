import { describe, expect, it } from 'vitest';

import { toMinorUnits } from './account-totals.js';

describe('toMinorUnits', () => {
  it('converts a two-decimal balance to minor units', () => {
    expect(toMinorUnits('4820.35', 2)).toBe(482035n);
  });

  it('converts a balance without a fraction', () => {
    expect(toMinorUnits('1500', 0)).toBe(1500n);
  });

  it('pads short fractions to the exponent', () => {
    expect(toMinorUnits('10.5', 2)).toBe(1050n);
  });

  it('keeps the sign on negative balances', () => {
    expect(toMinorUnits('-1240.50', 2)).toBe(-124050n);
  });

  it('throws on an unparseable balance', () => {
    expect(() => toMinorUnits('abc', 2)).toThrow();
  });
});
