import { Dialog } from '@/components/ui/dialog.js';
import { Sheet } from '@/components/ui/sheet.js';
import { CategoryForm } from '@/features/categories/components/CategoryForm/CategoryForm.js';
import type { Category } from '@/features/categories/gateways/categories.js';
import { useIsMobile } from '@/hooks/use-mobile.js';

export interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: Category['type'];
  category?: Category;
  categories: Category[];
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  type,
  category,
  categories,
}: CategoryFormDialogProps) {
  const isMobile = useIsMobile();
  const title = category === undefined ? 'Add category' : 'Rename category';
  const description =
    category === undefined ? 'Create a category or subcategory.' : 'Update the category name.';
  const form = (
    <CategoryForm
      type={type}
      category={category}
      categories={categories}
      onSuccess={handleSuccess}
    />
  );

  function handleSuccess() {
    onOpenChange(false);
  }

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
