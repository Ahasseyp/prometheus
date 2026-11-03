import type { Category } from '@/features/categories/gateways/categories.js';
import type { Budget } from '@/features/budgets/gateways/budgets.js';
import { getCurrencyExponent } from '@/lib/format-money.js';
import { decimalStringToMinorUnits } from '@/lib/money-parser.js';

export function getBudgetCategoryNames(budget: Budget, categories: Category[]): string {
  const names = budget.categoryIds
    .map((categoryId) => categories.find((category) => category.id === categoryId)?.name)
    .filter((name) => name !== undefined);

  if (names.length === 0) {
    return 'Uncategorized expenses';
  }

  return names.join(', ');
}

export function getBudgetTitle(budget: Budget, categoryNames: string): string {
  const name = budget.name.trim();
  return name.length > 0 ? name : categoryNames;
}

export function getBudgetPeriodLabel(period: Budget['period']): string {
  return period.charAt(0).toUpperCase() + period.slice(1);
}

export function isOverBudget(remaining: string): boolean {
  return remaining.trim().startsWith('-');
}

export function getBudgetProgressPercent(
  spent: string,
  available: string,
  currency: string
): number {
  const exponent = getCurrencyExponent(currency);
  const spentMinorUnits = decimalStringToMinorUnits(spent, exponent);
  const availableMinorUnits = decimalStringToMinorUnits(available, exponent);
  return getBudgetProgressPercentFromMinorUnits(spentMinorUnits, availableMinorUnits);
}

export function getBudgetProgressPercentFromMinorUnits(
  spentMinorUnits: bigint,
  availableMinorUnits: bigint
): number {
  if (availableMinorUnits <= 0n) {
    return spentMinorUnits > 0n ? 100 : 0;
  }

  const percent = (spentMinorUnits * 100n) / availableMinorUnits;
  const cappedPercent = percent > 100n ? 100n : percent;
  return Number(cappedPercent);
}

export function sumBudgetMoney(values: string[], currency: string): bigint {
  const exponent = getCurrencyExponent(currency);
  return values.reduce((total, value) => total + decimalStringToMinorUnits(value, exponent), 0n);
}
