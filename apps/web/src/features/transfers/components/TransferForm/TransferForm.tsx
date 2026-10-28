import { useMemo, useState } from 'react';
import { useForm, useStore } from '@tanstack/react-form';
import { convertMoney, createMoney, isCurrencyCode, isPositiveDecimal } from '@prometheus/domain';
import { format } from 'date-fns';
import { z } from 'zod';

import { Button } from '@/components/ui/button.js';
import { Field } from '@/components/ui/field.js';
import { Input } from '@/components/ui/input.js';
import { Select } from '@/components/ui/select.js';
import { Spinner } from '@/components/ui/spinner.js';
import { DatePicker } from '@/components/molecules/DatePicker/DatePicker.js';
import { AmountInput } from '@/components/molecules/AmountInput/AmountInput.js';
import { FormError } from '@/components/form/FormError.js';
import { FormField } from '@/components/form/FormField.js';
import { formatMoney } from '@/lib/format-money.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import {
  useCreateTransfer,
  useUpdateTransfer,
  type Transfer,
} from '@/features/transfers/gateways/transfers.js';
import { getTransferMutationErrorMessage } from '@/features/transfers/lib/transfer-errors.js';

const AMOUNT_PATTERN = /^\d+(\.\d+)?$/;

// The destination amount is derived from the source amount and Exchange Rate,
// converted with the domain Money helpers so rounding matches the backend
// (half-up to the destination Currency's exponent).
function deriveDestinationAmount(
  amount: string,
  exchangeRate: string,
  sourceCurrency: string,
  destinationCurrency: string
): string | null {
  if (!isCurrencyCode(sourceCurrency) || !isCurrencyCode(destinationCurrency)) {
    return null;
  }
  const source = createMoney(amount, sourceCurrency);
  if (!source.ok) {
    return null;
  }
  const converted = convertMoney(source.value, exchangeRate, destinationCurrency);
  return converted.ok ? converted.value.toDecimal() : null;
}

export interface TransferFormProps {
  accounts?: Account[];
  transfer?: Transfer;
  onSuccess: () => void;
}

export function TransferForm({ accounts, transfer, onSuccess }: TransferFormProps) {
  const createTransfer = useCreateTransfer();
  const updateTransfer = useUpdateTransfer();
  const isEditing = transfer !== undefined;
  const isPending = isEditing ? updateTransfer.isPending : createTransfer.isPending;
  const [formError, setFormError] = useState<string | null>(null);
  const formSchema = useMemo(() => buildTransferFormSchema(accounts), [accounts]);
  // The form state is initialized once per mount; the dialog unmounts the form
  // when closed, so an edited Transfer refetching cannot clobber user input.
  const defaultValues = useMemo(() => buildDefaultValues(transfer), [transfer]);

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: handleSubmit,
  });

  const sourceAccountId = useStore(form.store, (state) => state.values.sourceAccountId);
  const destinationAccountId = useStore(form.store, (state) => state.values.destinationAccountId);
  const amount = useStore(form.store, (state) => state.values.amount);
  const exchangeRate = useStore(form.store, (state) => state.values.exchangeRate);

  const sourceAccount = accounts?.find((account) => account.id === sourceAccountId);
  const destinationAccount = accounts?.find((account) => account.id === destinationAccountId);
  const isCrossCurrency =
    sourceAccount !== undefined &&
    destinationAccount !== undefined &&
    sourceAccount.currency !== destinationAccount.currency;
  const derivedDestinationAmount =
    isCrossCurrency && AMOUNT_PATTERN.test(amount.trim()) && isPositiveDecimal(exchangeRate)
      ? deriveDestinationAmount(
          amount.trim(),
          exchangeRate.trim(),
          sourceAccount.currency,
          destinationAccount.currency
        )
      : null;

  function getSubmitButtonText(): string {
    if (isPending) {
      return isEditing ? 'Saving…' : 'Adding transfer…';
    }
    return isEditing ? 'Save transfer' : 'Add transfer';
  }

  function clearFormError() {
    setFormError(null);
    createTransfer.reset();
    updateTransfer.reset();
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
      void form.setFieldValue('exchangeRate', '');
    });
  }

  function handleDateChange(onChange: (value: string) => void) {
    return withClearedError((date: Date | undefined) => {
      onChange(date === undefined ? '' : format(date, 'yyyy-MM-dd'));
    });
  }

  function handleMutationError(error: Error) {
    setFormError(getTransferMutationErrorMessage(error));
  }

  function handleSubmit({ value }: { value: TransferFormState }) {
    const description = value.description.trim();
    const crossCurrencyInput = isCrossCurrency
      ? {
          exchangeRate: value.exchangeRate.trim(),
          destinationAmount: derivedDestinationAmount ?? undefined,
        }
      : {};
    const mutationInput = {
      sourceAccountId: value.sourceAccountId,
      destinationAccountId: value.destinationAccountId,
      amount: value.amount.trim(),
      date: new Date(`${value.date}T00:00:00`),
      // A blank description is omitted: on create the backend applies its
      // default, on update the existing description is kept.
      description: description === '' ? undefined : description,
      ...crossCurrencyInput,
    };

    if (isEditing) {
      updateTransfer.mutate(
        { id: transfer.id, ...mutationInput },
        { onSuccess, onError: handleMutationError }
      );
      return;
    }

    createTransfer.mutate(mutationInput, { onSuccess, onError: handleMutationError });
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
        <FormField form={form} name="sourceAccountId" label="From" disabled={isPending}>
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
                  {sourceAccount?.name ?? null}
                </Select.Value>
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  {/* The selected destination Account is not a valid source. */}
                  {accounts
                    ?.filter((account) => account.id !== destinationAccountId)
                    .map((account) => (
                      <Select.Item key={account.id} value={account.id}>
                        {account.name}
                      </Select.Item>
                    ))}
                </Select.Group>
              </Select.Content>
            </Select>
          )}
        </FormField>

        <FormField form={form} name="destinationAccountId" label="To" disabled={isPending}>
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
                  {destinationAccount?.name ?? null}
                </Select.Value>
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  {/* The selected source Account is not a valid destination. */}
                  {accounts
                    ?.filter((account) => account.id !== sourceAccountId)
                    .map((account) => (
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
              currency={sourceAccount?.currency}
              onChange={withClearedError(fieldProps.onChange)}
            />
          )}
        </FormField>

        {isCrossCurrency && (
          <FormField
            form={form}
            name="exchangeRate"
            label="Exchange Rate"
            disabled={isPending}
            description={`${sourceAccount?.currency} to ${destinationAccount?.currency}`}
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                inputMode="decimal"
                autoComplete="off"
                onChange={withClearedError((event: React.ChangeEvent<HTMLInputElement>) =>
                  fieldProps.onChange(event.target.value)
                )}
              />
            )}
          </FormField>
        )}

        {derivedDestinationAmount !== null && destinationAccount !== undefined && (
          <p className="text-muted-foreground -mt-3 text-sm">
            Destination receives{' '}
            {formatMoney(derivedDestinationAmount, destinationAccount.currency)}
          </p>
        )}

        <FormField form={form} name="date" label="Date" disabled={isPending}>
          {(fieldProps) => (
            <DatePicker
              aria-label="Transfer date"
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
              placeholder="e.g., Monthly savings"
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

type TransferFormState = {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  exchangeRate: string;
  date: string;
  description: string;
};

function buildDefaultValues(transfer: Transfer | undefined): TransferFormState {
  if (transfer === undefined) {
    return {
      sourceAccountId: '',
      destinationAccountId: '',
      amount: '',
      exchangeRate: '',
      // The date crosses the form as a `yyyy-MM-dd` string; it is converted to
      // a local Date only when submitted to the API.
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
    };
  }

  return {
    sourceAccountId: transfer.sourceTransaction.accountId,
    destinationAccountId: transfer.destinationTransaction.accountId,
    amount: transfer.sourceTransaction.amount,
    exchangeRate: transfer.exchangeRate ?? '',
    date: format(new Date(transfer.sourceTransaction.date), 'yyyy-MM-dd'),
    description: transfer.sourceTransaction.description,
  };
}

// The schema is rebuilt when the Account list changes because the cross-currency
// Exchange Rate requirement depends on the selected Accounts' Currencies.
function buildTransferFormSchema(accounts: Account[] | undefined) {
  return z
    .object({
      sourceAccountId: z.string().refine((value) => value.length > 0, {
        message: 'Select a source account.',
      }),
      destinationAccountId: z.string().refine((value) => value.length > 0, {
        message: 'Select a destination account.',
      }),
      amount: z.string().refine((value) => AMOUNT_PATTERN.test(value.trim()) && Number(value) > 0, {
        message: 'Enter a positive amount.',
      }),
      exchangeRate: z.string().refine((value) => value.trim() === '' || isPositiveDecimal(value), {
        message: 'Enter a positive Exchange Rate.',
      }),
      date: z.string().refine((value) => value.length > 0, {
        message: 'Select a date.',
      }),
      description: z.string(),
    })
    .superRefine((value, context) => {
      if (value.sourceAccountId !== '' && value.sourceAccountId === value.destinationAccountId) {
        context.addIssue({
          code: 'custom',
          path: ['destinationAccountId'],
          message: 'Select two different accounts.',
        });
      }
      const source = accounts?.find((account) => account.id === value.sourceAccountId);
      const destination = accounts?.find((account) => account.id === value.destinationAccountId);
      if (
        source !== undefined &&
        destination !== undefined &&
        source.currency !== destination.currency &&
        value.exchangeRate.trim() === ''
      ) {
        context.addIssue({
          code: 'custom',
          path: ['exchangeRate'],
          message: 'Enter an Exchange Rate.',
        });
      }
    });
}
