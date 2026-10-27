import { Dialog } from '@/components/ui/dialog.js';
import { Sheet } from '@/components/ui/sheet.js';
import type { Category } from '@/features/categories/gateways/categories.js';
import { useIsMobile } from '@/hooks/use-mobile.js';

export interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: Category['type'];
  category?: Category;
  categories: Category[];
}

function CategoryFormStub({
  type,
  category,
  categories,
}: Omit<CategoryFormDialogProps, 'open' | 'onOpenChange'>) {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">CategoryFormDialog</p>
      <p>Mode: {category === undefined ? 'create' : 'rename'}</p>
      <p>Type: {type}</p>
      <p>Category: {category?.name ?? 'None'}</p>
      <p>Available categories: {categories.length}</p>
    </div>
  );
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
  const stub = <CategoryFormStub type={type} category={category} categories={categories} />;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <Sheet.Content side="bottom">
          <Sheet.Header>
            <Sheet.Title>{title}</Sheet.Title>
          </Sheet.Header>
          <div className="px-4 pb-4">{stub}</div>
        </Sheet.Content>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>{title}</Dialog.Title>
        </Dialog.Header>
        {stub}
      </Dialog.Content>
    </Dialog>
  );
}
