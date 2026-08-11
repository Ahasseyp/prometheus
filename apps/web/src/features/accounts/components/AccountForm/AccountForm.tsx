import { useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { AccountType, isCurrencyCode } from '@prometheus/domain';
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js';
import { FormError } from '@/components/form/FormError.js';
import { FormField } from '@/components/form/FormField.js';
import {
  useCreateAccount,
  useUpdateAccount,
  type Account,
} from '@/features/accounts/gateways/accounts.js';
import { getAccountMutationErrorMessage } from '@/features/accounts/lib/account-errors.js';
import { ACCOUNT_TYPE_META, ACCOUNT_TYPE_OPTIONS } from '@/features/accounts/lib/account-types.js';
import {
  getCurrencyOptions,
  type CurrencyCode,
} from '@/features/household/lib/currency-options.js';
import { getDefaultCurrency } from '@/features/household/lib/default-currency.js';

const currencyCodeSchema = z
  .string()
  .refine(isCurrencyCode, { message: 'Select a supported currency.' }) as z.ZodType<CurrencyCode>;

const accountFormSchema = z.object({
  name: z.string().refine((value) => value.trim().length > 0, {
    message: 'Enter an account name.',
  }),
  type: z.nativeEnum(AccountType),
  currency: currencyCodeSchema,
});

type FormState = z.infer<typeof accountFormSchema>;

export interface AccountFormProps {
  account?: Account;
  /**
   * Currency may only change while the account has no transactions (issue #23
   * rule). No transaction feature exists yet, so callers never pass this today
   * and the field stays editable; the prop is the seam for locking it later.
   * See docs/adr/0002-account-currency-lock-seam.md.
   */
  hasTransactions?: boolean;
  onSuccess?: () => void;
}

export function AccountForm({ account, hasTransactions = false, onSuccess }: AccountFormProps) {
  const isEditing = account !== undefined;
  const isCurrencyLocked = isEditing && hasTransactions;
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const isPending = createAccount.isPending || updateAccount.isPending;
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

  function getSubmitButtonText({
    isPending,
    isEditing,
  }: {
    isPending: boolean;
    isEditing: boolean;
  }): string {
    if (isPending) {
      return isEditing ? 'Saving…' : 'Adding account…';
    }
    return isEditing ? 'Save changes' : 'Add account';
  }

  function clearFormError() {
    setFormError(null);
    createAccount.reset();
    updateAccount.reset();
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

  function handleMutationError(error: Error) {
    setFormError(getAccountMutationErrorMessage(error));
  }

  function handleSubmit({ value }: { value: FormState }) {
    const name = value.name.trim();

    if (isEditing) {
      updateAccount.mutate(
        { id: account.id, name, type: value.type, currency: value.currency },
        { onSuccess: () => onSuccess?.(), onError: handleMutationError }
      );
      return;
    }

    createAccount.mutate(
      { name, type: value.type, currency: value.currency },
      { onSuccess: () => onSuccess?.(), onError: handleMutationError }
    );
  }

  function handleFormSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    form.handleSubmit();
  }

  const form = useForm({
    defaultValues: {
      name: account?.name ?? '',
      type: account?.type ?? AccountType.Checking,
      currency: (account?.currency as CurrencyCode | undefined) ?? defaultCurrency,
    } satisfies FormState,
    validators: {
      onSubmit: accountFormSchema,
    },
    onSubmit: handleSubmit,
  });

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-5" noValidate>
      {formError && <FormError message={formError} />}

      <FieldGroup>
        <FormField form={form} name="name" label="Account name" disabled={isPending}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              autoComplete="off"
              placeholder="e.g., Everyday checking"
              onChange={handleNameChange(fieldProps.onChange)}
            />
          )}
        </FormField>

        <FormField form={form} name="type" label="Account type" disabled={isPending}>
          {(fieldProps) => (
            <Select
              value={fieldProps.value}
              onValueChange={handleSelectChange(fieldProps.onChange)}
              disabled={fieldProps.disabled}
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-invalid={fieldProps['aria-invalid']}
                onBlur={fieldProps.onBlur}
                className="w-full"
              >
                <SelectValue placeholder="Select an account type">
                  {fieldProps.value
                    ? ACCOUNT_TYPE_META[fieldProps.value as AccountType].label
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ACCOUNT_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ACCOUNT_TYPE_META[type].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </FormField>

        <FormField
          form={form}
          name="currency"
          label="Currency"
          disabled={isPending || isCurrencyLocked}
          description={
            isCurrencyLocked
              ? "Currency can't be changed once the account has transactions."
              : undefined
          }
        >
          {(fieldProps) => {
            const selectedOption =
              currencyComboboxOptions.find((option) => option.value === fieldProps.value) ?? null;

            return (
              <Combobox
                items={currencyComboboxOptions}
                value={selectedOption}
                onValueChange={handleComboboxChange(fieldProps.onChange)}
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
        {isPending && <Spinner data-icon="inline-start" />}
        {getSubmitButtonText({ isPending, isEditing })}
      </Button>
    </form>
  );
}
