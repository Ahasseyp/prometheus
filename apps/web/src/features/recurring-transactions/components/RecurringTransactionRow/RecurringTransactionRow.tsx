import { getSignedTransactionAmount, getTransactionIcon } from '@/lib/transaction-presentation.js';

import { formatMoney } from '@/lib/format-money.js';
import { Table } from '@/components/ui/table.js';

import type { RecurringTransaction } from '@/features/recurring-transactions/gateways/recurring-transactions.js';
import {
  formatRecurringTransactionDate,
  getFrequencyLabel,
} from '@/features/recurring-transactions/lib/recurring-transaction-presentation.js';

export interface RecurringTransactionRowProps {
  recurringTransaction: RecurringTransaction;
}

export function RecurringTransactionRow({ recurringTransaction }: RecurringTransactionRowProps) {
  const isExpense = recurringTransaction.type === 'expense';
  const Icon = getTransactionIcon(isExpense);
  const signedAmount = getSignedTransactionAmount(isExpense, recurringTransaction.amount);
  const label = recurringTransaction.description || recurringTransaction.categoryName;

  return (
    <Table.Row>
      <Table.Cell className="max-w-64">
        <span className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{label}</span>
            <span className="truncate text-sm text-muted-foreground">
              {recurringTransaction.accountName}
            </span>
          </span>
        </span>
      </Table.Cell>
      <Table.Cell className="text-muted-foreground">
        {getFrequencyLabel(recurringTransaction.frequency)}
      </Table.Cell>
      <Table.Cell className="text-muted-foreground">
        {formatRecurringTransactionDate(recurringTransaction.nextDate)}
      </Table.Cell>
      <Table.Cell className="text-right font-semibold tabular-nums">
        {formatMoney(signedAmount, recurringTransaction.accountCurrency)}
      </Table.Cell>
    </Table.Row>
  );
}
