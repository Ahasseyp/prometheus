import { getSignedTransactionAmount, getTransactionIcon } from '@/lib/transaction-presentation.js';

import { formatMoney } from '@/lib/format-money.js';
import { Table } from '@/components/ui/table.js';

import { RecurringTransactionActions } from '@/features/recurring-transactions/components/RecurringTransactionActions/RecurringTransactionActions.js';
import type { RecurringTransaction } from '@/features/recurring-transactions/gateways/recurring-transactions.js';
import {
  formatRecurringTransactionDate,
  getRecurrenceLabel,
} from '@/features/recurring-transactions/lib/recurring-transaction-presentation.js';

export interface RecurringTransactionRowProps {
  recurringTransaction: RecurringTransaction;
  onSkip?: (recurringTransaction: RecurringTransaction) => void;
}

export function RecurringTransactionRow({
  recurringTransaction,
  onSkip,
}: RecurringTransactionRowProps) {
  const isExpense = recurringTransaction.type === 'expense';
  const Icon = getTransactionIcon(isExpense);
  const signedAmount = getSignedTransactionAmount(isExpense, recurringTransaction.amount);
  const label = recurringTransaction.description || recurringTransaction.categoryName;

  return (
    <Table.Row>
      <Table.Cell className="max-w-64">
        <span className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate font-medium">{label}</span>
        </span>
      </Table.Cell>
      <Table.Cell className="text-muted-foreground">{recurringTransaction.accountName}</Table.Cell>
      <Table.Cell className="text-muted-foreground">
        {getRecurrenceLabel(recurringTransaction.interval, recurringTransaction.period)}
      </Table.Cell>
      <Table.Cell className="text-muted-foreground">
        {formatRecurringTransactionDate(recurringTransaction.nextDate)}
      </Table.Cell>
      <Table.Cell className="text-right font-semibold tabular-nums">
        {formatMoney(signedAmount, recurringTransaction.accountCurrency)}
      </Table.Cell>
      <Table.Cell>
        {onSkip !== undefined && (
          <RecurringTransactionActions
            recurringTransaction={recurringTransaction}
            onSkip={onSkip}
          />
        )}
      </Table.Cell>
    </Table.Row>
  );
}
