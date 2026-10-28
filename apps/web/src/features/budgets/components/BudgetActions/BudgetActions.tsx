import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { DropdownMenu } from '@/components/ui/dropdown-menu.js';

import type { Budget } from '@/features/budgets/gateways/budgets.js';

export interface BudgetActionsProps {
  label: string;
  budget: Budget;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
}

export function BudgetActions({ label, budget, onEdit, onDelete }: BudgetActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${label}`} />}
      >
        <EllipsisVertical aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Group>
          <DropdownMenu.Item onClick={() => onEdit(budget)}>
            <Pencil aria-hidden="true" />
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item variant="destructive" onClick={() => onDelete(budget)}>
            <Trash2 aria-hidden="true" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
