import { useState } from 'react';

import { FormError } from '@/components/form/FormError.js';
import { Button } from '@/components/ui/button.js';
import { Dialog } from '@/components/ui/dialog.js';
import { Spinner } from '@/components/ui/spinner.js';
import { useDeleteCategory, type Category } from '@/features/categories/gateways/categories.js';
import { getCategoryMutationErrorMessage } from '@/features/categories/lib/category-errors.js';

export interface DeleteCategoryDialogProps {
  category: Category | null;
  onClose: () => void;
}

export function DeleteCategoryDialog({ category, onClose }: DeleteCategoryDialogProps) {
  const { mutate, isPending } = useDeleteCategory();
  const [error, setError] = useState<string | null>(null);

  if (category === null) {
    return null;
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setError(null);
      return;
    }
    onClose();
  }

  function handleDelete() {
    if (category === null) {
      return;
    }

    mutate(
      { id: category.id },
      {
        onSuccess: () => onClose(),
        onError: (mutationError) => setError(getCategoryMutationErrorMessage(mutationError)),
      }
    );
  }

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Delete {category.name}?</Dialog.Title>
          <Dialog.Description>This can't be undone.</Dialog.Description>
        </Dialog.Header>
        {error && <FormError message={error} />}
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? (
              <>
                <Spinner data-icon="inline-start" />
                Deleting…
              </>
            ) : (
              'Delete category'
            )}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
