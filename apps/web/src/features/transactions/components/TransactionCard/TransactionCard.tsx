import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { formatMoney } from '@/lib/format-money.js';

import type { Transaction } from '@/features/transactions/gateways/transactions.js';
import { getTransactionDetailLabel } from '@/features/transactions/lib/transfer-presentation.js';

export interface TransactionCardProps {
  transaction: Transaction;
  onSelect: (transaction: Transaction) => void;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

export function TransactionCard({ transaction, onSelect }: TransactionCardProps) {
  const isExpense = transaction.type === 'expense';
  const Icon = isExpense ? ArrowDownLeft : ArrowUpRight;
  // The stored amount is always positive; the sign comes from the type. The
  // minus is part of the formatted value, not just the color.
  const signedAmount = isExpense ? `-${transaction.amount}` : transaction.amount;
  const label = transaction.description || transaction.categoryName;
  const detailLabel = getTransactionDetailLabel(transaction);

  return (
    <li>
      <Button
        variant="ghost"
        onClick={() => onSelect(transaction)}
        className="h-auto w-full justify-start rounded-lg border p-3 text-left font-normal hover:bg-muted/50"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{label}</span>
          <span className="truncate text-xs text-muted-foreground">
            {detailLabel} · {transaction.accountName}
          </span>
          <span className="text-xs text-muted-foreground">
            {dateFormatter.format(new Date(transaction.date))}
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {formatMoney(signedAmount, transaction.accountCurrency)}
        </span>
      </Button>
    </li>
  );
}
