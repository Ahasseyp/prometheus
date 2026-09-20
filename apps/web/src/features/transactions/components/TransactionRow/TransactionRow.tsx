import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

import { Table } from '@/components/ui/table.js';
import { formatMoney } from '@/features/accounts/lib/format-money.js';

import type { Transaction } from '@/features/transactions/gateways/transactions.js';

export interface TransactionRowProps {
  transaction: Transaction;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

export function TransactionRow({ transaction }: TransactionRowProps) {
  const isExpense = transaction.type === 'expense';
  const Icon = isExpense ? ArrowDownLeft : ArrowUpRight;
  // The stored amount is always positive; the sign comes from the type. The
  // minus is part of the formatted value, not just the color.
  const signedAmount = isExpense ? `-${transaction.amount}` : transaction.amount;

  return (
    <Table.Row>
      <Table.Cell className="text-muted-foreground">
        {dateFormatter.format(new Date(transaction.date))}
      </Table.Cell>
      <Table.Cell className="max-w-64">
        <span className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate font-medium">
            {transaction.description || 'Untitled transaction'}
          </span>
        </span>
      </Table.Cell>
      <Table.Cell>{transaction.categoryName}</Table.Cell>
      <Table.Cell className="text-muted-foreground">{transaction.accountName}</Table.Cell>
      <Table.Cell className="text-right font-semibold">
        {formatMoney(signedAmount, transaction.accountCurrency)}
      </Table.Cell>
    </Table.Row>
  );
}
