import { useMemo, useState } from 'react';
import { useForm, useStore } from '@tanstack/react-form';
import { isCurrencyCode, isPositiveDecimal } from '@prometheus/domain';
import { format } from 'date-fns';
import { z } from 'zod';

import { AmountInput } from '@/components/molecules/AmountInput/AmountInput.js';
import { DatePicker } from '@/components/molecules/DatePicker/DatePicker.js';
import { FormError } from '@/components/form/FormError.js';
import { FormField } from '@/components/form/FormField.js';
import { Button } from '@/components/ui/button.js';
import { Combobox } from '@/components/ui/combobox.js';
import { Field } from '@/components/ui/field.js';
import { Input } from '@/components/ui/input.js';
import { Spinner } from '@/components/ui/spinner.js';
import {
  getCurrencyOptions,
  type CurrencyCode,
} from '@/features/household/lib/currency-options.js';
import { getDefaultCurrency } from '@/features/household/lib/default-currency.js';
import { useCreateGoal, useUpdateGoal, type Goal } from '@/features/goals/gateways/goals.js';
import { getGoalMutationErrorMessage } from '@/features/goals/lib/goal-errors.js';

const currencyCodeSchema = z
  .string()
  .refine(isCurrencyCode, { message: 'Select a supported currency.' }) as z.ZodType<CurrencyCode>;

const goalFormSchema = z.object({
  name: z.string().refine((value) => value.trim().length > 0, {
    message: 'Enter a goal name.',
  }),
  target: z.string().refine(isPositiveDecimal, {
    message: 'Enter a positive amount.',
  }),
  currency: currencyCodeSchema,
  // The deadline crosses the form as a `yyyy-MM-dd` string; it is converted
  // to a local Date only when submitted.
  deadline: z.string().refine((value) => value.length > 0, {
    message: 'Select a deadline.',
  }),
});

type FormState = z.infer<typeof goalFormSchema>;
type CurrencyOption = {
  value: string;
  label: string;
};

export interface GoalFormProps {
  goal?: Goal;
  onSuccess?: () => void;
}

export function GoalForm({ goal, onSuccess }: GoalFormProps) {
  const isEditing = goal !== undefined;
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const isPending = createGoal.isPending || updateGoal.isPending;
  const [formError, setFormError] = useState<string | null>(null);
  const currencyOptions = useMemo(() => getCurrencyOptions(), []);
  const currencyComboboxOptions = useMemo<CurrencyOption[]>(
    () =>
      currencyOptions.map((option) => ({
        value: option.code,
        label: `${option.label} (${option.code})`,
      })),
    [currencyOptions]
  );
  const defaultCurrency = useMemo(() => getDefaultCurrency(), []);

  function getSubmitButtonText({
    isPending,
    isEditing,
  }: {
    isPending: boolean;
    isEditing: boolean;
  }): string {
    if (isPending) {
      return isEditing ? 'Saving…' : 'Adding goal…';
    }
    return isEditing ? 'Save changes' : 'Add goal';
  }

  function clearFormError() {
    setFormError(null);
    createGoal.reset();
    updateGoal.reset();
  }

  function withClearedError<T>(handler: (value: T) => void): (value: T) => void {
    return (value) => {
      handler(value);
      clearFormError();
    };
  }

  function handleNameChange(onChange: (value: string) => void) {
    return withClearedError((event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    });
  }

  function handleAmountChange(onChange: (value: string) => void) {
    return withClearedError((value: string) => {
      onChange(value);
    });
  }

  function handleCurrencyChange(onChange: (value: string) => void) {
    return withClearedError((option: CurrencyOption | null) => {
      onChange(option?.value ?? '');
    });
  }

  function handleDateChange(onChange: (value: string) => void) {
    return withClearedError((date: Date | undefined) => {
      onChange(date === undefined ? '' : format(date, 'yyyy-MM-dd'));
    });
  }

  function handleMutationError(error: Error) {
    setFormError(getGoalMutationErrorMessage(error));
  }

  function handleSubmit({ value }: { value: FormState }) {
    const input = {
      name: value.name.trim(),
      target: value.target.trim(),
    };

    if (isEditing) {
      updateGoal.mutate(
        { id: goal.id, ...input, deadline: new Date(`${value.deadline}T00:00:00`) },
        { onSuccess: () => onSuccess?.(), onError: handleMutationError }
      );
      return;
    }

    createGoal.mutate(
      {
        ...input,
        currency: value.currency,
        deadline: new Date(`${value.deadline}T00:00:00`),
      },
      {
        onSuccess: () => onSuccess?.(),
        onError: handleMutationError,
      }
    );
  }

  function handleFormSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    form.handleSubmit();
  }

  const form = useForm({
    defaultValues: {
      name: goal?.name ?? '',
      target: goal?.target ?? '',
      currency: (goal?.currency ?? defaultCurrency) as CurrencyCode,
      deadline: goal ? format(new Date(goal.deadline), 'yyyy-MM-dd') : '',
    } satisfies FormState,
    validators: {
      onSubmit: goalFormSchema,
    },
    onSubmit: handleSubmit,
  });
  const selectedCurrency = useStore(form.store, (state) => state.values.currency);

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-5" noValidate>
      {formError && <FormError message={formError} />}

      <Field.Group>
        <FormField form={form} name="name" label="Goal name" disabled={isPending}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              autoComplete="off"
              placeholder="Emergency fund"
              onChange={handleNameChange(fieldProps.onChange)}
            />
          )}
        </FormField>

        <FormField form={form} name="target" label="Target amount" disabled={isPending}>
          {(fieldProps) => (
            <AmountInput
              {...fieldProps}
              currency={selectedCurrency}
              placeholder="0.00"
              onChange={handleAmountChange(fieldProps.onChange)}
            />
          )}
        </FormField>

        <FormField
          form={form}
          name="currency"
          label="Currency"
          disabled={isPending || isEditing}
          // Goal Currency is fixed after creation (ADR-0002); the update API
          // omits it, so the field is locked in edit mode.
          description={isEditing ? 'The currency is fixed once a goal is created.' : undefined}
        >
          {(fieldProps) => {
            const selectedOption =
              currencyComboboxOptions.find((option) => option.value === fieldProps.value) ?? null;

            return (
              <Combobox
                items={currencyComboboxOptions}
                value={selectedOption}
                onValueChange={handleCurrencyChange(fieldProps.onChange)}
                itemToStringLabel={(option) => option.label}
                itemToStringValue={(option) => option.value}
                disabled={fieldProps.disabled}
                autoHighlight
              >
                <Combobox.Input
                  id={fieldProps.id}
                  name={fieldProps.name}
                  placeholder="Select a currency"
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

        <FormField
          form={form}
          name="deadline"
          label="Deadline"
          disabled={isPending}
          description="A date by which you want to reach the target."
        >
          {(fieldProps) => (
            <DatePicker
              value={fieldProps.value === '' ? undefined : new Date(`${fieldProps.value}T00:00:00`)}
              onChange={handleDateChange(fieldProps.onChange)}
              disabled={fieldProps.disabled}
              aria-label="Deadline"
            />
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
