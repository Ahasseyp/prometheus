import { Dialog } from '@/components/ui/dialog.js';
import { Sheet } from '@/components/ui/sheet.js';

import { GoalForm } from '@/features/goals/components/GoalForm/GoalForm.js';
import type { Goal } from '@/features/goals/gateways/goals.js';
import { useIsMobile } from '@/hooks/use-mobile.js';

export interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal;
}

export function GoalFormDialog({ open, onOpenChange, goal }: GoalFormDialogProps) {
  const isMobile = useIsMobile();
  const isEditing = goal !== undefined;
  const title = isEditing ? 'Edit goal' : 'Add goal';
  const description = isEditing
    ? 'Update the name, target amount, or deadline.'
    : 'Set a target amount and deadline for something you want to save toward.';
  const form = <GoalForm goal={goal} onSuccess={() => onOpenChange(false)} />;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <Sheet.Content side="bottom">
          <Sheet.Header>
            <Sheet.Title>{title}</Sheet.Title>
            <Sheet.Description>{description}</Sheet.Description>
          </Sheet.Header>
          <div className="px-4 pb-4">{form}</div>
        </Sheet.Content>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
        </Dialog.Header>
        {form}
      </Dialog.Content>
    </Dialog>
  );
}
