import { useMemo, useState } from 'react';
import { useForm, useStore } from '@tanstack/react-form';
import { TransactionType } from '@prometheus/domain';
import { format } from 'date-fns';
import { z } from 'zod';

import { Button } from '@/components/ui/button.js';
import { Combobox } from '@/components/ui/combobox.js';
import { Field } from '@/components/ui/field.js';
import { Input } from '@/components/ui/input.js';
import { Select } from '@/components/ui/select.js';
import { Spinner } from '@/components/ui/spinner.js';
import { ToggleGroup } from '@/components/ui/toggle-group.js';
import { DatePicker } from '@/components/molecules/DatePicker/DatePicker.js';
import { AmountInput } from '@/components/molecules/AmountInput/AmountInput.js';
import { FormError } from '@/components/form/FormError.js';
import { FormField } from '@/components/form/FormField.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import { useCategories } from '@/features/categories/gateways/categories.js';
import {
  useCreateTransaction,
  type Transaction,
} from '@/features/transactions/gateways/transactions.js';
import { getTransactionMutationErrorMessage } from '@/features/transactions/lib/transaction-errors.js';

const AMOUNT_PATTERN = /^\d+(\.\d+)?$/;

const transactionFormSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.string().refine((value) => AMOUNT_PATTERN.test(value.trim()) && Number(value) > 0, {
    message: 'Enter a positive amount.',
  }),
  accountId: z.string().refine((value) => value.length > 0, {
    message: 'Select an account.',
  }),
  categoryId: z.string().refine((value) => value.length > 0, {
    message: 'Select a category.',
  }),
  // The date crosses the form as a `yyyy-MM-dd` string; it is converted to a
  // local Date only when submitted to the API.
  date: z.string().refine((value) => value.length > 0, {
    message: 'Select a date.',
  }),
  description: z.string(),
});

type FormState = z.infer<typeof transactionFormSchema>;

export interface TransactionFormProps {
  accounts?: Account[];
  transaction?: Transaction;
  onSuccess?: () => void;
}

const TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.Expense]: 'Expense',
  [TransactionType.Income]: 'Income',
};

export function TransactionForm({ accounts, transaction, onSuccess }: TransactionFormProps) {
  const isEditing = transaction !== undefined;
  const createTransaction = useCreateTransaction();
  const isPending = createTransaction.isPending;
  const [formError, setFormError] = useState<string | null>(null);
  const { data: categories } = useCategories();

  const form = useForm({
    defaultValues: {
      type: transaction?.type ?? TransactionType.Expense,
      amount: transaction?.amount ?? '',
      accountId: transaction?.accountId ?? '',
      categoryId: transaction?.categoryId ?? '',
      date: transaction
        ? format(new Date(transaction.date), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
      description: transaction?.description ?? '',
    } satisfies FormState,
    validators: {
      onSubmit: transactionFormSchema,
    },
    onSubmit: handleSubmit,
  });

  const type = useStore(form.store, (state) => state.values.type);
  const accountId = useStore(form.store, (state) => state.values.accountId);

  // Categories are filtered to the selected transaction type; subcategories
  // are shown nested under their parent so the one-level hierarchy reads.
  const categoryOptions = useMemo(() => {
    const categoryById = new Map(categories?.map((category) => [category.id, category]));
    return (categories ?? [])
      .filter((category) => category.type === type)
      .map((category) => {
        const parent = category.parentId === null ? null : categoryById.get(category.parentId);
        const label =
          parent === undefined || parent === null
            ? category.name
            : `${parent.name} / ${category.name}`;
        return { value: category.id, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categories, type]);

  function getSubmitButtonText(): string {
    if (isPending) {
      return isEditing ? 'Saving…' : 'Adding transaction…';
    }
    return isEditing ? 'Save changes' : 'Add transaction';
  }

  function clearFormError() {
    setFormError(null);
    createTransaction.reset();
  }

  function withClearedError<T>(handler: (value: T) => void): (value: T) => void {
    return (value) => {
      handler(value);
      clearFormError();
    };
  }

  function handleSelectChange(onChange: (value: string) => void) {
    return withClearedError((value: string | null) => {
      if (value === null) {
        return;
      }
      onChange(value);
    });
  }

  function handleComboboxChange(onChange: (value: string) => void) {
    return withClearedError((option: { value: string } | null) => {
      onChange(option?.value ?? '');
    });
  }

  function handleDateChange(onChange: (value: string) => void) {
    return withClearedError((date: Date | undefined) => {
      onChange(date === undefined ? '' : format(date, 'yyyy-MM-dd'));
    });
  }

  function handleMutationError(error: Error) {
    setFormError(getTransactionMutationErrorMessage(error));
  }

  function handleSubmit({ value }: { value: FormState }) {
    const description = value.description.trim();

    createTransaction.mutate(
      {
        type: value.type,
        amount: value.amount.trim(),
        accountId: value.accountId,
        categoryId: value.categoryId,
        date: new Date(`${value.date}T00:00:00`),
        description: description === '' ? undefined : description,
      },
      { onSuccess: () => onSuccess?.(), onError: handleMutationError }
    );
  }

  function handleFormSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    form.handleSubmit();
  }

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-5" noValidate>
      {formError && <FormError message={formError} />}

      <Field.Group>
        <FormField form={form} name="type" label="Type" disabled={isPending}>
          {(fieldProps) => (
            <ToggleGroup
              id={fieldProps.id}
              value={[fieldProps.value]}
              onValueChange={withClearedError((groupValue: string[]) => {
                const value = groupValue[groupValue.length - 1];
                if (value === undefined) {
                  return;
                }
                fieldProps.onChange(value);
                // The category list is filtered by type, so a category picked
                // under the other type would no longer be selectable.
                void form.setFieldValue('categoryId', '');
              })}
              variant="outline"
              spacing={0}
              className="w-full"
              aria-label="Transaction type"
            >
              {Object.values(TransactionType).map((typeValue) => (
                <ToggleGroup.Item
                  key={typeValue}
                  value={typeValue}
                  className="flex-1"
                  aria-label={TYPE_LABELS[typeValue]}
                >
                  {TYPE_LABELS[typeValue]}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup>
          )}
        </FormField>

        <FormField form={form} name="accountId" label="Account" disabled={isPending}>
          {(fieldProps) => (
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
                <Select.Value placeholder="Select an account">
                  {accounts?.find((account) => account.id === fieldProps.value)?.name ?? null}
                </Select.Value>
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  {accounts?.map((account) => (
                    <Select.Item key={account.id} value={account.id}>
                      {account.name}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select>
          )}
        </FormField>

        <FormField form={form} name="amount" label="Amount" disabled={isPending}>
          {(fieldProps) => (
            <AmountInput
              {...fieldProps}
              currency={accounts?.find((account) => account.id === accountId)?.currency}
              onChange={withClearedError(fieldProps.onChange)}
            />
          )}
        </FormField>

        <FormField form={form} name="categoryId" label="Category" disabled={isPending}>
          {(fieldProps) => {
            const selectedOption =
              categoryOptions.find((option) => option.value === fieldProps.value) ?? null;

            return (
              // Remount on type change so a stale selection from the other
              // type doesn't linger in the combobox input.
              <Combobox
                key={type}
                items={categoryOptions}
                value={selectedOption}
                onValueChange={handleComboboxChange(fieldProps.onChange)}
                itemToStringLabel={(option) => option.label}
                itemToStringValue={(option) => option.value}
                disabled={fieldProps.disabled}
                autoHighlight
              >
                <Combobox.Input
                  id={fieldProps.id}
                  name={fieldProps.name}
                  placeholder="Select a category"
                  onBlur={fieldProps.onBlur}
                  aria-invalid={fieldProps['aria-invalid']}
                />
                <Combobox.Content>
                  <Combobox.List>
                    <Combobox.Collection>
                      {(option) => (
                        <Combobox.Item key={option.value} value={option}>
                          {option.label}
                        </Combobox.Item>
                      )}
                    </Combobox.Collection>
                  </Combobox.List>
                </Combobox.Content>
              </Combobox>
            );
          }}
        </FormField>

        <FormField form={form} name="date" label="Date" disabled={isPending}>
          {(fieldProps) => (
            <DatePicker
              aria-label="Transaction date"
              value={fieldProps.value === '' ? undefined : new Date(`${fieldProps.value}T00:00:00`)}
              onChange={handleDateChange(fieldProps.onChange)}
              disabled={fieldProps.disabled}
            />
          )}
        </FormField>

        <FormField form={form} name="description" label="Description" disabled={isPending}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              autoComplete="off"
              placeholder="e.g., Weekly groceries"
              onChange={withClearedError((event: React.ChangeEvent<HTMLInputElement>) =>
                fieldProps.onChange(event.target.value)
              )}
            />
          )}
        </FormField>
      </Field.Group>

      <Button type="submit" disabled={isPending}>
        {isPending && <Spinner data-icon="inline-start" />}
        {getSubmitButtonText()}
      </Button>
    </form>
  );
}
