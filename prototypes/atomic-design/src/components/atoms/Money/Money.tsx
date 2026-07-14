import { cn } from '~/lib/utils';
import { formatMoney, invert, isNegative, type Money as MoneyType } from '~/domain/money';

export interface MoneyProps {
  value: MoneyType;
  /** Show income/expense semantics: expenses as positive red, income as positive green. */
  direction?: 'expense' | 'income' | 'neutral';
  className?: string;
}

export function Money({ value, direction = 'neutral', className }: MoneyProps) {
  const displayValue = direction === 'expense' && !isNegative(value)
    ? invert(value)
    : direction === 'income' && isNegative(value)
      ? invert(value)
      : value;

  const toneClass =
    direction === 'expense'
      ? 'text-red-600'
      : direction === 'income'
        ? 'text-emerald-600'
        : isNegative(value)
          ? 'text-red-600'
          : 'text-foreground';

  return (
    <span className={cn('tabular-nums font-medium', toneClass, className)}>
      {formatMoney(displayValue)}
    </span>
  );
}
