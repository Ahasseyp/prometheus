import { Dialog } from '@/components/ui/dialog.js';
import { Sheet } from '@/components/ui/sheet.js';

import type { Account } from '@/features/accounts/gateways/accounts.js';
import { ContributionForm } from '@/features/goals/components/ContributionForm/ContributionForm.js';
import type { Goal, GoalContribution } from '@/features/goals/gateways/goals.js';
import { useIsMobile } from '@/hooks/use-mobile.js';

export interface ContributionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  accounts: Account[];
  contribution?: GoalContribution;
}

export function ContributionFormDialog({
  open,
  onOpenChange,
  goal,
  accounts,
  contribution,
}: ContributionFormDialogProps) {
  const isMobile = useIsMobile();
  const isEditing = contribution !== undefined;
  const title = isEditing ? 'Edit contribution' : 'Add contribution';
  const description = isEditing
    ? 'Move the earmarked money to a different account or change the amount.'
    : goal === null
      ? ''
      : `Earmark money from a ${goal.currency} account toward “${goal.name}”.`;

  if (goal === null) {
    return null;
  }

  const form = (
    <ContributionForm
      goal={goal}
      accounts={accounts}
      contribution={contribution}
      onSuccess={() => onOpenChange(false)}
    />
  );

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
