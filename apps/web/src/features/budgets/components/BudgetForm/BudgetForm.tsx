import { useMemo, useState } from 'react';
import { useForm, useStore } from '@tanstack/react-form';
import { BudgetPeriod, isPositiveDecimal } from '@prometheus/domain';
import { z } from 'zod';

import { AmountInput } from '@/components/molecules/AmountInput/AmountInput.js';
import { FormError } from '@/components/form/FormError.js';
import { FormField } from '@/components/form/FormField.js';
import { Button } from '@/components/ui/button.js';
import { Combobox, useComboboxAnchor } from '@/components/ui/combobox.js';
import { Field } from '@/components/ui/field.js';
import { Spinner } from '@/components/ui/spinner.js';
import { ToggleGroup } from '@/components/ui/toggle-group.js';
import type { Category } from '@/features/categories/gateways/categories.js';
import {
  useCreateBudget,
  useUpdateBudget,
  type Budget,
} from '@/features/budgets/gateways/budgets.js';
import { getBudgetMutationErrorMessage } from '@/features/budgets/lib/budget-errors.js';

const budgetPeriods = [BudgetPeriod.Weekly, BudgetPeriod.Monthly, BudgetPeriod.Yearly];

const budgetFormSchema = z.object({
  amount: z.string().refine(isPositiveDecimal, {
    message: 'Enter a positive amount.',
  }),
  period: z.nativeEnum(BudgetPeriod),
  categoryIds: z.array(z.string()).min(1, {
    message: 'Choose at least one category.',
  }),
});

type FormState = z.infer<typeof budgetFormSchema>;
type CategoryOption = {
  value: string;
  label: string;
};

export interface BudgetFormProps {
  budget?: Budget;
  categories: Category[];
  reportingCurrency?: string;
  onSuccess?: () => void;
}

export function BudgetForm({ budget, categories, reportingCurrency, onSuccess }: BudgetFormProps) {
  const isEditing = budget !== undefined;
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const isPending = createBudget.isPending || updateBudget.isPending;
  const [formError, setFormError] = useState<string | null>(null);
  const categoryAnchorRef = useComboboxAnchor();
  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories]
  );
  const categoryOptions = useMemo<CategoryOption[]>(
    () => expenseCategories.map((category) => ({ value: category.id, label: category.name })),
    [expenseCategories]
  );

  function getSubmitButtonText({
    isPending,
    isEditing,
  }: {
    isPending: boolean;
    isEditing: boolean;
  }): string {
    if (isPending) {
      return isEditing ? 'Saving…' : 'Adding budget…';
    }
    return isEditing ? 'Save changes' : 'Add budget';
  }

  function clearFormError() {
    setFormError(null);
    createBudget.reset();
    updateBudget.reset();
  }

  function withClearedError<T>(handler: (value: T) => void): (value: T) => void {
    return (value) => {
      handler(value);
      clearFormError();
    };
  }

  function handleAmountChange(onChange: (value: string) => void) {
    return withClearedError((value: string) => {
      onChange(value);
    });
  }

  function handlePeriodChange(onChange: (value: string) => void) {
    return withClearedError((values: string[]) => {
      const nextPeriod = values.at(-1);
      if (nextPeriod !== undefined) {
        onChange(nextPeriod);
      }
    });
  }

  function handleCategoriesChange(onChange: (value: string[]) => void) {
    return withClearedError((options: CategoryOption[]) => {
      onChange(options.map((option) => option.value));
    });
  }

  function handleMutationError(error: Error) {
    setFormError(getBudgetMutationErrorMessage(error));
  }

  function handleSubmit({ value }: { value: FormState }) {
    const input = {
      limit: value.amount.trim(),
      period: value.period,
      categoryIds: value.categoryIds,
    };

    if (isEditing) {
      updateBudget.mutate(
        { id: budget.id, ...input },
        { onSuccess: () => onSuccess?.(), onError: handleMutationError }
      );
      return;
    }

    createBudget.mutate(input, {
      onSuccess: () => onSuccess?.(),
      onError: handleMutationError,
    });
  }

  function handleFormSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    form.handleSubmit();
  }

  const form = useForm({
    defaultValues: {
      amount: budget?.limit ?? '',
      period: budget?.period ?? BudgetPeriod.Monthly,
      categoryIds: budget?.categoryIds ?? [],
    } satisfies FormState,
    validators: {
      onSubmit: budgetFormSchema,
    },
    onSubmit: handleSubmit,
  });
  const selectedCategoryIds = useStore(form.store, (state) => state.values.categoryIds);
  const selectedCategoryOptions = categoryOptions.filter((option) =>
    selectedCategoryIds.includes(option.value)
  );

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-5" noValidate>
      {formError && <FormError message={formError} />}

      <Field.Group>
        <FormField form={form} name="amount" label="Amount" disabled={isPending}>
          {(fieldProps) => (
            <AmountInput
              {...fieldProps}
              currency={reportingCurrency}
              placeholder="0.00"
              onChange={handleAmountChange(fieldProps.onChange)}
            />
          )}
        </FormField>

        <FormField form={form} name="period" label="Budget period" disabled={isPending}>
          {(fieldProps) => (
            <ToggleGroup
              variant="outline"
              spacing={0}
              value={[fieldProps.value]}
              onValueChange={handlePeriodChange(fieldProps.onChange)}
              disabled={fieldProps.disabled}
              aria-invalid={fieldProps['aria-invalid']}
            >
              {budgetPeriods.map((period) => (
                <ToggleGroup.Item key={period} value={period}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup>
          )}
        </FormField>

        <FormField
          form={form}
          name="categoryIds"
          label="Categories"
          disabled={isPending}
          description="Choose one or more expense Categories."
        >
          {(fieldProps) => (
            <Combobox
              multiple
              items={categoryOptions}
              value={selectedCategoryOptions}
              onValueChange={handleCategoriesChange((categoryIds) => {
                void form.setFieldValue('categoryIds', categoryIds);
              })}
              itemToStringLabel={(option) => option.label}
              itemToStringValue={(option) => option.value}
              isItemEqualToValue={(item, value) => item.value === value.value}
              disabled={fieldProps.disabled}
              autoHighlight
            >
              <Combobox.Chips ref={categoryAnchorRef} aria-invalid={fieldProps['aria-invalid']}>
                {selectedCategoryOptions.map((option) => (
                  <Combobox.Chip key={option.value}>{option.label}</Combobox.Chip>
                ))}
                <Combobox.ChipsInput
                  id={fieldProps.id}
                  name={fieldProps.name}
                  placeholder="Select categories"
                  onBlur={fieldProps.onBlur}
                  aria-invalid={fieldProps['aria-invalid']}
                />
              </Combobox.Chips>
              <Combobox.Content anchor={categoryAnchorRef}>
                <Combobox.List>
                  <Combobox.Collection>
                    {(option) => (
                      <Combobox.Item key={option.value} value={option}>
                        {option.label}
                      </Combobox.Item>
                    )}
                  </Combobox.Collection>
                </Combobox.List>
                <Combobox.Empty>No expense categories found.</Combobox.Empty>
              </Combobox.Content>
            </Combobox>
          )}
        </FormField>
      </Field.Group>

      <Button type="submit" disabled={isPending}>
        {isPending && <Spinner data-icon="inline-start" />}
        {getSubmitButtonText({ isPending, isEditing })}
      </Button>
    </form>
  );
}
