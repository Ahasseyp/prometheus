import { ArrowDownLeft, ArrowUpRight, EllipsisVertical, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { DropdownMenu } from '@/components/ui/dropdown-menu.js';
import { Table } from '@/components/ui/table.js';
import { formatMoney } from '@/lib/format-money.js';

import type { Transaction } from '@/features/transactions/gateways/transactions.js';
import { getTransactionDetailLabel } from '@/features/transactions/lib/transfer-presentation.js';

export interface TransactionRowProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

export function TransactionRow({ transaction, onEdit, onDelete }: TransactionRowProps) {
  const isExpense = transaction.type === 'expense';
  const Icon = isExpense ? ArrowUpRight : ArrowDownLeft;
  // The stored amount is always positive; the sign comes from the type. The
  // minus is part of the formatted value, not just the color.
  const signedAmount = isExpense ? `-${transaction.amount}` : transaction.amount;
  const label = transaction.description || transaction.categoryName;
  const detailLabel = getTransactionDetailLabel(transaction);
  const showActions = onEdit !== undefined && onDelete !== undefined;

  return (
    <Table.Row>
      <Table.Cell className="text-muted-foreground">
        {dateFormatter.format(new Date(transaction.date))}
      </Table.Cell>
      <Table.Cell className="max-w-64">
        <span className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate font-medium">{label}</span>
        </span>
      </Table.Cell>
      <Table.Cell>{detailLabel}</Table.Cell>
      <Table.Cell className="text-muted-foreground">{transaction.accountName}</Table.Cell>
      <Table.Cell className="text-right font-semibold tabular-nums">
        {formatMoney(signedAmount, transaction.accountCurrency)}
      </Table.Cell>
      <Table.Cell>
        {showActions && (
          <DropdownMenu>
            <DropdownMenu.Trigger
              render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${label}`} />}
            >
              <EllipsisVertical aria-hidden="true" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Group>
                <DropdownMenu.Item onClick={() => onEdit(transaction)}>
                  <Pencil aria-hidden="true" />
                  Edit
                </DropdownMenu.Item>
                <DropdownMenu.Item variant="destructive" onClick={() => onDelete(transaction)}>
                  <Trash2 aria-hidden="true" />
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Group>
            </DropdownMenu.Content>
          </DropdownMenu>
        )}
      </Table.Cell>
    </Table.Row>
  );
}
