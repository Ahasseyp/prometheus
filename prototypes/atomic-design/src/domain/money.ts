export type CurrencyCode = 'MXN' | 'USD';

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export function formatMoney(
  money: Money,
  options: { signDisplay?: 'auto' | 'always' | 'never' } = {},
): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currency,
    signDisplay: options.signDisplay ?? 'auto',
  });
  return formatter.format(money.amount);
}

export function isNegative(money: Money): boolean {
  return money.amount < 0;
}

export function invert(money: Money): Money {
  return { ...money, amount: -money.amount };
}
