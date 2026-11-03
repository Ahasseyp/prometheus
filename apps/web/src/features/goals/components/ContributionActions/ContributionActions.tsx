import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { DropdownMenu } from '@/components/ui/dropdown-menu.js';

import type { GoalContribution } from '@/features/goals/gateways/goals.js';

export interface ContributionActionsProps {
  label: string;
  contribution: GoalContribution;
  onEdit: (contribution: GoalContribution) => void;
  onDelete: (contribution: GoalContribution) => void;
}

export function ContributionActions({
  label,
  contribution,
  onEdit,
  onDelete,
}: ContributionActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${label}`} />}
      >
        <EllipsisVertical aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Group>
          <DropdownMenu.Item onClick={() => onEdit(contribution)}>
            <Pencil aria-hidden="true" />
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item variant="destructive" onClick={() => onDelete(contribution)}>
            <Trash2 aria-hidden="true" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
