import { EllipsisVertical, Pencil, SkipForward, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { DropdownMenu } from '@/components/ui/dropdown-menu.js';

import type { RecurringTransaction } from '@/features/recurring-transactions/gateways/recurring-transactions.js';

export interface RecurringTransactionActionsProps {
  recurringTransaction: RecurringTransaction;
  onEdit: (recurringTransaction: RecurringTransaction) => void;
  onDelete: (recurringTransaction: RecurringTransaction) => void;
  onSkip: (recurringTransaction: RecurringTransaction) => void;
}

export function RecurringTransactionActions({
  recurringTransaction,
  onEdit,
  onDelete,
  onSkip,
}: RecurringTransactionActionsProps) {
  const label = recurringTransaction.description || recurringTransaction.categoryName;

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${label}`} />}
      >
        <EllipsisVertical aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Group>
          <DropdownMenu.Item onClick={() => onEdit(recurringTransaction)}>
            <Pencil aria-hidden="true" />
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => onSkip(recurringTransaction)}>
            <SkipForward aria-hidden="true" />
            Skip next Transaction Instance
          </DropdownMenu.Item>
          <DropdownMenu.Item variant="destructive" onClick={() => onDelete(recurringTransaction)}>
            <Trash2 aria-hidden="true" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
