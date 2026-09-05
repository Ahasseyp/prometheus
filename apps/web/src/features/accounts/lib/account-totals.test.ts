import { describe, expect, it } from 'vitest';

import { AccountType } from '@prometheus/domain';

import { sumAccountTotals, toMinorUnits } from './account-totals.js';

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

describe('sumAccountTotals', () => {
  it('returns an empty list when there are no accounts', () => {
    expect(sumAccountTotals([])).toEqual([]);
  });

  it('sums accounts in a single currency exactly', () => {
    const totals = sumAccountTotals([
      { balance: '0.10', currency: 'USD', type: AccountType.Checking },
      { balance: '0.20', currency: 'USD', type: AccountType.Savings },
    ]);

    expect(totals).toEqual([{ currency: 'USD', minorUnits: 30n }]);
  });

  it('never mixes totals across currencies', () => {
    const totals = sumAccountTotals([
      { balance: '100.00', currency: 'USD', type: AccountType.Checking },
      { balance: '1500', currency: 'JPY', type: AccountType.Savings },
      { balance: '50.00', currency: 'USD', type: AccountType.Cash },
    ]);

    expect(totals).toEqual([
      { currency: 'USD', minorUnits: 15000n },
      { currency: 'JPY', minorUnits: 1500n },
    ]);
  });

  it('subtracts loan balances from totals', () => {
    const totals = sumAccountTotals([
      { balance: '1000.00', currency: 'USD', type: AccountType.Checking },
      { balance: '250.00', currency: 'USD', type: AccountType.Loan },
    ]);

    expect(totals).toEqual([{ currency: 'USD', minorUnits: 75000n }]);
  });

  it('respects each currency exponent while summing', () => {
    const totals = sumAccountTotals([
      { balance: '1500', currency: 'JPY', type: AccountType.Savings },
      { balance: '500', currency: 'JPY', type: AccountType.Loan },
    ]);

    expect(totals).toEqual([{ currency: 'JPY', minorUnits: 1000n }]);
  });
});
