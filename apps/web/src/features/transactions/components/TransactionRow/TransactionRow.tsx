import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';

import { formatMoney } from '@/features/accounts/lib/format-money.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';

import type { Transaction } from '@/features/transactions/gateways/transactions.js';

export interface TransactionRowProps {
  transaction: Transaction;
  account?: Account;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

export function TransactionRow({ transaction, account }: TransactionRowProps) {
  const isExpense = transaction.type === 'expense';
  const Icon = isExpense ? ArrowDownLeft : ArrowUpRight;
  // The stored amount is always positive; the sign comes from the type. The
  // minus is part of the formatted value, not just the color.
  const signedAmount = isExpense ? `-${transaction.amount}` : transaction.amount;
  const currency = account?.currency ?? 'USD';

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {transaction.description ? (
            <Icon className="size-4" aria-hidden="true" />
          ) : (
            <Receipt className="size-4" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {transaction.description || 'Untitled transaction'}
          </p>
          <p className="text-xs text-muted-foreground">
            {dateFormatter.format(new Date(transaction.date))}
            {account ? ` · ${account.name}` : ''}
          </p>
        </div>
      </div>
      <p className="shrink-0 text-sm font-semibold">{formatMoney(signedAmount, currency)}</p>
    </div>
  );
}
