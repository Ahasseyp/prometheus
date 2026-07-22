import { useMemo, useState, type FormEvent } from 'react';
import { useForm } from '@tanstack/react-form';
import { isCurrencyCode } from '@prometheus/domain';
import { z } from 'zod';

import { Button } from '@/components/ui/button.js';
import { Spinner } from '@/components/ui/spinner.js';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox.js';
import { FieldGroup } from '@/components/ui/field.js';
import { Input } from '@/components/ui/input.js';
import { FormError } from '@/components/form/FormError.js';
import { FormField } from '@/components/form/FormField.js';
import {
  useCreateHousehold,
  type CreateHouseholdOutput,
} from '@/features/household/gateways/household.js';
import {
  getCurrencyOptions,
  type CurrencyCode,
} from '@/features/household/lib/currency-options.js';
import { getDefaultCurrency } from '@/features/household/lib/default-currency.js';
import { USER_ALREADY_HAS_HOUSEHOLD_ERROR } from '@/features/household/lib/household-errors.js';

type FormState = {
  name: string;
  reportingCurrency: CurrencyCode;
};

const currencyCodeSchema = z
  .string()
  .refine(isCurrencyCode, { message: 'Select a supported currency.' }) as z.ZodType<CurrencyCode>;

const createHouseholdFormSchema = z.object({
  name: z.string().refine((value) => value.trim().length > 0, {
    message: 'Enter a household name.',
  }),
  reportingCurrency: currencyCodeSchema,
});

export interface CreateHouseholdFormProps {
  onSuccess?: (result: CreateHouseholdOutput) => void;
}

export function CreateHouseholdForm({ onSuccess }: CreateHouseholdFormProps) {
  const { mutate, isPending, reset } = useCreateHousehold();
  const [formError, setFormError] = useState<string | null>(null);
  const currencyOptions = useMemo(() => getCurrencyOptions(), []);
  const currencyComboboxOptions = useMemo(
    () =>
      currencyOptions.map((option) => ({
        value: option.code,
        label: `${option.label} (${option.code})`,
      })),
    [currencyOptions]
  );
  const defaultCurrency = useMemo(() => getDefaultCurrency(), []);

  function clearFormError() {
    setFormError(null);
    reset();
  }

  function handleCreateHouseholdSuccess(result: CreateHouseholdOutput) {
    if (result.ok) {
      onSuccess?.(result);
      return;
    }

    if (result.error === USER_ALREADY_HAS_HOUSEHOLD_ERROR) {
      // The user's session already has a household (e.g., a concurrent tab
      // created one, or the household query was stale). Treat this as
      // completion so the layout's household check can send them to the
      // dashboard instead of surfacing a confusing conflict error.
      onSuccess?.(result);
      return;
    }

    setFormError('Something went wrong. Please try again.');
  }

  function handleCreateHouseholdError() {
    setFormError('Something went wrong. Please check your connection and try again.');
  }

  function handleSubmit({ value }: { value: FormState }) {
    mutate(
      { name: value.name.trim(), reportingCurrency: value.reportingCurrency },
      {
        onSuccess: handleCreateHouseholdSuccess,
        onError: handleCreateHouseholdError,
      }
    );
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    form.handleSubmit();
  }

  function handleNameChange(fieldProps: { onChange: (value: string) => void }) {
    return function onNameChange(event: React.ChangeEvent<HTMLInputElement>) {
      fieldProps.onChange(event.target.value);
      clearFormError();
    };
  }

  function handleCurrencyChange(fieldProps: { onChange: (value: string) => void }) {
    return function onCurrencyChange(option: { value: string } | null) {
      fieldProps.onChange(option?.value ?? '');
      clearFormError();
    };
  }

  const form = useForm({
    defaultValues: {
      name: '',
      reportingCurrency: defaultCurrency,
    } satisfies FormState,
    validators: {
      onSubmit: createHouseholdFormSchema,
    },
    onSubmit: handleSubmit,
  });

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-5" noValidate>
      {formError && <FormError message={formError} />}

      <FieldGroup>
        <FormField form={form} name="name" label="Household name" disabled={isPending}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              autoComplete="off"
              placeholder="e.g., Home"
              onChange={handleNameChange(fieldProps)}
            />
          )}
        </FormField>

        <FormField
          form={form}
          name="reportingCurrency"
          label="Reporting currency"
          disabled={isPending}
          description="Used across all reports and totals."
        >
          {(fieldProps) => {
            const selectedOption =
              currencyComboboxOptions.find((option) => option.value === fieldProps.value) ?? null;

            return (
              <Combobox
                items={currencyComboboxOptions}
                value={selectedOption}
                onValueChange={handleCurrencyChange(fieldProps)}
                itemToStringLabel={(option) => option.label}
                itemToStringValue={(option) => option.value}
                disabled={fieldProps.disabled}
                autoHighlight
              >
                <ComboboxInput
                  id={fieldProps.id}
                  name={fieldProps.name}
                  placeholder="Select a currency"
                  onBlur={fieldProps.onBlur}
                  aria-invalid={fieldProps['aria-invalid']}
                />
                <ComboboxContent>
                  <ComboboxList>
                    <ComboboxCollection>
                      {(option) => (
                        <ComboboxItem key={option.value} value={option}>
                          {option.label}
                        </ComboboxItem>
                      )}
                    </ComboboxCollection>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            );
          }}
        </FormField>
      </FieldGroup>

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Spinner data-icon="inline-start" />
            Creating household…
          </>
        ) : (
          'Create household'
        )}
      </Button>
    </form>
  );
}
