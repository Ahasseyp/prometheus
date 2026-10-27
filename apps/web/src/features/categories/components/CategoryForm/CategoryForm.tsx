import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { FormError } from '@/components/form/FormError.js';
import { FormField } from '@/components/form/FormField.js';
import { Button } from '@/components/ui/button.js';
import { Field } from '@/components/ui/field.js';
import { Input } from '@/components/ui/input.js';
import { Select } from '@/components/ui/select.js';
import { Spinner } from '@/components/ui/spinner.js';
import {
  useCreateCategory,
  useUpdateCategory,
  type Category,
} from '@/features/categories/gateways/categories.js';
import { getCategoryMutationErrorMessage } from '@/features/categories/lib/category-errors.js';
import {
  CATEGORY_ICON_KEYS,
  categoryIcon,
  categoryIconLabel,
} from '@/features/categories/lib/category-icons.js';

const NO_PARENT = 'none';

const categoryFormSchema = z.object({
  name: z.string().refine((value) => value.trim().length > 0, {
    message: 'Enter a category name.',
  }),
  parentId: z.string(),
  icon: z.string(),
});

type FormState = z.infer<typeof categoryFormSchema>;

export interface CategoryFormProps {
  type: Category['type'];
  category?: Category;
  categories: Category[];
  onSuccess?: () => void;
}

export function CategoryForm({ type, category, categories, onSuccess }: CategoryFormProps) {
  const isEditing = category !== undefined;
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const isPending = createCategory.isPending || updateCategory.isPending;
  const [formError, setFormError] = useState<string | null>(null);
  const parentCategories = categories.filter((candidate) => candidate.parentId === null);

  const form = useForm({
    defaultValues: {
      name: category?.name ?? '',
      parentId: NO_PARENT,
      icon: category?.icon ?? 'shopping-cart',
    } satisfies FormState,
    validators: {
      onSubmit: categoryFormSchema,
    },
    onSubmit: handleSubmit,
  });

  function clearFormError() {
    setFormError(null);
    createCategory.reset();
    updateCategory.reset();
  }

  function handleNameChange(onChange: (value: string) => void) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
      clearFormError();
    };
  }

  function handleSelectChange(onChange: (value: string) => void) {
    return (value: string | null) => {
      if (value !== null) {
        onChange(value);
      }
      clearFormError();
    };
  }

  function handleMutationError(error: Error) {
    setFormError(getCategoryMutationErrorMessage(error));
  }

  function handleSubmit({ value }: { value: FormState }) {
    const name = value.name.trim();
    const mutationCallbacks = { onSuccess: () => onSuccess?.(), onError: handleMutationError };

    if (isEditing) {
      updateCategory.mutate({ id: category.id, name, icon: value.icon }, mutationCallbacks);
      return;
    }

    createCategory.mutate(
      {
        name,
        type,
        parentId: value.parentId === NO_PARENT ? undefined : value.parentId,
        icon: value.icon,
      },
      mutationCallbacks
    );
  }

  function handleFormSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    form.handleSubmit();
  }

  function getSubmitButtonText() {
    if (isPending) {
      return isEditing ? 'Saving…' : 'Adding category…';
    }
    return isEditing ? 'Save changes' : 'Add category';
  }

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-5" noValidate>
      {formError && <FormError message={formError} />}

      <Field.Group>
        <FormField form={form} name="name" label="Category name" disabled={isPending}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              autoComplete="off"
              placeholder="e.g., Groceries"
              onChange={handleNameChange(fieldProps.onChange)}
            />
          )}
        </FormField>

        <FormField form={form} name="icon" label="Category icon" disabled={isPending}>
          {(fieldProps) => {
            const SelectedIcon = categoryIcon(fieldProps.value);

            return (
              <Select
                value={fieldProps.value}
                onValueChange={handleSelectChange(fieldProps.onChange)}
                disabled={fieldProps.disabled}
              >
                <Select.Trigger
                  id={fieldProps.id}
                  aria-invalid={fieldProps['aria-invalid']}
                  onBlur={fieldProps.onBlur}
                  className="w-full"
                >
                  <Select.Value>
                    <span className="flex items-center gap-2">
                      <SelectedIcon aria-hidden="true" />
                      {categoryIconLabel(fieldProps.value)}
                    </span>
                  </Select.Value>
                </Select.Trigger>
                <Select.Content>
                  <Select.Group>
                    {CATEGORY_ICON_KEYS.map((icon) => {
                      const Icon = categoryIcon(icon);
                      return (
                        <Select.Item key={icon} value={icon}>
                          <Icon aria-hidden="true" />
                          {categoryIconLabel(icon)}
                        </Select.Item>
                      );
                    })}
                  </Select.Group>
                </Select.Content>
              </Select>
            );
          }}
        </FormField>

        {!isEditing && (
          <FormField
            form={form}
            name="parentId"
            label="Parent category"
            disabled={isPending}
            description="Optional. Choose a parent to create a subcategory."
          >
            {(fieldProps) => {
              const selectedParent = parentCategories.find(
                (candidate) => candidate.id === fieldProps.value
              );

              return (
                <Select
                  value={fieldProps.value}
                  onValueChange={handleSelectChange(fieldProps.onChange)}
                  disabled={fieldProps.disabled}
                >
                  <Select.Trigger
                    id={fieldProps.id}
                    aria-invalid={fieldProps['aria-invalid']}
                    onBlur={fieldProps.onBlur}
                    className="w-full"
                  >
                    <Select.Value placeholder="No parent">
                      {selectedParent?.name ?? 'No parent'}
                    </Select.Value>
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Group>
                      <Select.Item value={NO_PARENT}>No parent</Select.Item>
                      {parentCategories.map((parent) => (
                        <Select.Item key={parent.id} value={parent.id}>
                          {parent.name}
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </Select.Content>
                </Select>
              );
            }}
          </FormField>
        )}
      </Field.Group>

      <Button type="submit" disabled={isPending}>
        {isPending && <Spinner data-icon="inline-start" />}
        {getSubmitButtonText()}
      </Button>
    </form>
  );
}
