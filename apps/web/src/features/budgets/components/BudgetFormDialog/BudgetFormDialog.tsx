import { Dialog } from '@/components/ui/dialog.js';
import { Sheet } from '@/components/ui/sheet.js';
import type { Category } from '@/features/categories/gateways/categories.js';
import { BudgetForm } from '@/features/budgets/components/BudgetForm/BudgetForm.js';
import type { Budget } from '@/features/budgets/gateways/budgets.js';
import { useIsMobile } from '@/hooks/use-mobile.js';

export interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget;
  categories: Category[];
  reportingCurrency?: string;
}

export function BudgetFormDialog({
  open,
  onOpenChange,
  budget,
  categories,
  reportingCurrency,
}: BudgetFormDialogProps) {
  const isMobile = useIsMobile();
  const isEditing = budget !== undefined;
  const title = isEditing ? 'Edit budget' : 'Add budget';
  const description = isEditing
    ? 'Update the spending limit or tracked Categories.'
    : 'Set a spending limit for one or more expense Categories.';
  const form = (
    <BudgetForm
      budget={budget}
      categories={categories}
      reportingCurrency={reportingCurrency}
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
