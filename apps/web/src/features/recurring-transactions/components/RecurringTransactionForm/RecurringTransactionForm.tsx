import { useMemo, useState } from 'react';
import { useForm, useStore } from '@tanstack/react-form';
import { isPositiveDecimal, RecurrencePeriod, TransactionType } from '@prometheus/domain';
import { format } from 'date-fns';
import { z } from 'zod';

import { Button } from '@/components/ui/button.js';
import { Combobox } from '@/components/ui/combobox.js';
import { Field } from '@/components/ui/field.js';
import { Input } from '@/components/ui/input.js';
import { Spinner } from '@/components/ui/spinner.js';
import { ToggleGroup } from '@/components/ui/toggle-group.js';
import { AmountInput } from '@/components/molecules/AmountInput/AmountInput.js';
import { DatePicker } from '@/components/molecules/DatePicker/DatePicker.js';
import { FormError } from '@/components/form/FormError.js';
import { FormField } from '@/components/form/FormField.js';
import { useAccounts } from '@/features/accounts/gateways/accounts.js';
import { useCategories } from '@/features/categories/gateways/categories.js';
import { useCreateRecurringTransaction } from '@/features/recurring-transactions/gateways/recurring-transactions.js';
import { getRecurringTransactionMutationErrorMessage } from '@/features/recurring-transactions/lib/recurring-transaction-errors.js';

const FORM_TYPES = [TransactionType.Expense, TransactionType.Income] as const;
type FormTransactionType = (typeof FORM_TYPES)[number];

const TYPE_LABELS: Record<FormTransactionType, string> = {
  [TransactionType.Expense]: 'Expense',
  [TransactionType.Income]: 'Income',
};

const PERIODS = [RecurrencePeriod.Week, RecurrencePeriod.Month, RecurrencePeriod.Year] as const;

const PERIOD_LABELS: Record<(typeof PERIODS)[number], string> = {
  [RecurrencePeriod.Week]: 'weeks',
  [RecurrencePeriod.Month]: 'months',
  [RecurrencePeriod.Year]: 'years',
};

const recurringTransactionFormSchema = z.object({
  type: z.enum([TransactionType.Income, TransactionType.Expense]),
  amount: z.string().refine(isPositiveDecimal, {
    message: 'Enter a positive amount.',
  }),
  accountId: z.string().refine((value) => value.length > 0, {
    message: 'Select an account.',
  }),
  categoryId: z.string().refine((value) => value.length > 0, {
    message: 'Select a category.',
  }),
  interval: z.coerce.number().int().min(1, 'Interval must be at least 1.'),
  period: z.nativeEnum(RecurrencePeriod),
  // The start date crosses the form as a `yyyy-MM-dd` string; it is converted
  // to a local Date only when submitted to the API.
  startDate: z.string().refine((value) => value.length > 0, {
    message: 'Select a start date.',
  }),
  description: z.string(),
});

type FormState = z.infer<typeof recurringTransactionFormSchema>;
type Option = { value: string; label: string };

export interface RecurringTransactionFormProps {
  onSuccess?: () => void;
}

export function RecurringTransactionForm({ onSuccess }: RecurringTransactionFormProps) {
  const createRecurringTransaction = useCreateRecurringTransaction();
  const isPending = createRecurringTransaction.isPending;
  const [formError, setFormError] = useState<string | null>(null);
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const defaultFormValues: FormState = {
    type: TransactionType.Expense,
    amount: '',
    accountId: '',
    categoryId: '',
    interval: 1,
    period: RecurrencePeriod.Month,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    description: '',
  };

  const form = useForm({
    defaultValues: defaultFormValues,
    validators: {
      onSubmit: recurringTransactionFormSchema,
    },
    onSubmit: handleSubmit,
  });

  const type = useStore(form.store, (state) => state.values.type);
  const accountId = useStore(form.store, (state) => state.values.accountId);
  const account = accounts?.find((a) => a.id === accountId);
  const accountCurrency = account?.currency;

  const accountOptions = useMemo<Option[]>(
    () =>
      (accounts ?? []).map((accountItem) => ({ value: accountItem.id, label: accountItem.name })),
    [accounts]
  );

  const categoryOptions = useMemo<Option[]>(() => {
    const categoryById = new Map((categories ?? []).map((category) => [category.id, category]));
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
    return isPending ? 'Adding schedule…' : 'Add schedule';
  }

  function clearFormError() {
    setFormError(null);
    createRecurringTransaction.reset();
  }

  function withClearedError<T>(handler: (value: T) => void): (value: T) => void {
    return (value) => {
      handler(value);
      clearFormError();
    };
  }

  function handleComboboxChange(onChange: (value: string) => void) {
    return withClearedError((option: Option | null) => {
      onChange(option?.value ?? '');
    });
  }

  function handleDateChange(onChange: (value: string) => void) {
    return withClearedError((date: Date | undefined) => {
      onChange(date === undefined ? '' : format(date, 'yyyy-MM-dd'));
    });
  }

  function handleTypeChange(onChange: (value: string) => void) {
    return withClearedError((values: string[]) => {
      const nextType = values.at(-1);
      if (nextType === undefined) {
        return;
      }
      onChange(nextType);
      // The category list is filtered by type, so a category picked under the
      // other type would no longer be selectable.
      void form.setFieldValue('categoryId', '');
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

  function handleMutationError(error: Error) {
    setFormError(getRecurringTransactionMutationErrorMessage(error));
  }

  function handleSubmit({ value }: { value: FormState }) {
    const description = value.description.trim();
    createRecurringTransaction.mutate(
      {
        type: value.type,
        amount: value.amount.trim(),
        accountId: value.accountId,
        categoryId: value.categoryId,
        startDate: new Date(`${value.startDate}T00:00:00`),
        period: value.period,
        interval: value.interval,
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
              onValueChange={handleTypeChange(fieldProps.onChange)}
              variant="outline"
              spacing={0}
              className="w-full"
              aria-label="Schedule type"
            >
              {FORM_TYPES.map((typeValue) => (
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
          {(fieldProps) => {
            const selectedOption =
              accountOptions.find((option) => option.value === fieldProps.value) ?? null;

            return (
              <Combobox
                items={accountOptions}
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
                  placeholder="Select an account"
                  onBlur={fieldProps.onBlur}
                  aria-invalid={fieldProps['aria-invalid']}
                  // Keep password managers (1Password, LastPass) away from an
                  // input they mistake for a login field.
                  passwordManagerIgnore
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

        <FormField form={form} name="amount" label="Amount" disabled={isPending}>
          {(fieldProps) => (
            <AmountInput
              {...fieldProps}
              currency={accountCurrency}
              placeholder="0.00"
              onChange={withClearedError(fieldProps.onChange)}
            />
          )}
        </FormField>

        <FormField form={form} name="categoryId" label="Category" disabled={isPending}>
          {(fieldProps) => {
            const selectedOption =
              categoryOptions.find((option) => option.value === fieldProps.value) ?? null;

            return (
              // Remount on type change so a stale selection from the other type
              // doesn't linger in the combobox input.
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
                  // Keep password managers (1Password, LastPass) away from an
                  // input they mistake for a login field.
                  passwordManagerIgnore
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

        <FormField form={form} name="interval" label="Repeat every" disabled={isPending}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="number"
              min={1}
              step={1}
              placeholder="1"
              onChange={withClearedError((event: React.ChangeEvent<HTMLInputElement>) =>
                fieldProps.onChange(event.target.value)
              )}
            />
          )}
        </FormField>

        <FormField form={form} name="period" label="Period" disabled={isPending}>
          {(fieldProps) => (
            <ToggleGroup
              id={fieldProps.id}
              value={[fieldProps.value]}
              onValueChange={handlePeriodChange(fieldProps.onChange)}
              variant="outline"
              spacing={0}
              className="w-full"
              aria-label="Period"
            >
              {PERIODS.map((period) => (
                <ToggleGroup.Item
                  key={period}
                  value={period}
                  className="flex-1"
                  aria-label={PERIOD_LABELS[period]}
                >
                  {PERIOD_LABELS[period]}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup>
          )}
        </FormField>

        <FormField form={form} name="startDate" label="Start date" disabled={isPending}>
          {(fieldProps) => (
            <DatePicker
              aria-label="Start date"
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
              placeholder="e.g., Monthly rent"
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
