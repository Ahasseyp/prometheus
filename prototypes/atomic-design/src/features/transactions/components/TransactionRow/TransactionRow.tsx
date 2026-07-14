import { Money } from '~/components/atoms/Money';
import { CategoryPill } from '~/components/atoms/CategoryPill';
import type { Money as MoneyType } from '~/domain/money';

export interface TransactionRowProps {
  description: string;
  amount: MoneyType;
  category: { name: string; color?: string };
  date: string;
  onClick?: () => void;
}

export function TransactionRow({
  description,
  amount,
  category,
  date,
  onClick,
}: TransactionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-medium">{description}</span>
        <div className="flex items-center gap-2">
          <CategoryPill name={category.name} color={category.color} />
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
      </div>
      <Money value={amount} direction={amount.amount < 0 ? 'expense' : 'income'} />
    </button>
  );
}
