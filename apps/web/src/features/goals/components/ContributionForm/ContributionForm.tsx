import { useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { isPositiveDecimal } from '@prometheus/domain';
import { z } from 'zod';

import { AmountInput } from '@/components/molecules/AmountInput/AmountInput.js';
import { FormError } from '@/components/form/FormError.js';
import { FormField } from '@/components/form/FormField.js';
import { Button } from '@/components/ui/button.js';
import { Combobox } from '@/components/ui/combobox.js';
import { Field } from '@/components/ui/field.js';
import { Spinner } from '@/components/ui/spinner.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import {
  useCreateGoalContribution,
  useUpdateGoalContribution,
  type Goal,
  type GoalContribution,
} from '@/features/goals/gateways/goals.js';
import { getGoalMutationErrorMessage } from '@/features/goals/lib/goal-errors.js';
import { getEligibleFundingAccounts } from '@/features/goals/lib/goal-presentation.js';
import { formatMoney } from '@/lib/format-money.js';

const contributionFormSchema = z.object({
  accountId: z.string().refine((value) => value.length > 0, {
    message: 'Choose an account.',
  }),
  amount: z.string().refine(isPositiveDecimal, {
    message: 'Enter a positive amount.',
  }),
});

type FormState = z.infer<typeof contributionFormSchema>;
type AccountOption = {
  value: string;
  label: string;
};

export interface ContributionFormProps {
  goal: Goal;
  accounts: Account[];
  contribution?: GoalContribution;
  onSuccess?: () => void;
}

export function ContributionForm({
  goal,
  accounts,
  contribution,
  onSuccess,
}: ContributionFormProps) {
  const isEditing = contribution !== undefined;
  const createContribution = useCreateGoalContribution();
  const updateContribution = useUpdateGoalContribution();
  const isPending = createContribution.isPending || updateContribution.isPending;
  const [formError, setFormError] = useState<string | null>(null);
  const eligibleAccounts = useMemo(
    () => getEligibleFundingAccounts(accounts, goal),
    [accounts, goal]
  );
  const accountOptions = useMemo<AccountOption[]>(
    () =>
      eligibleAccounts.map((account) => ({
        value: account.id,
        label: `${account.name} · ${formatMoney(account.unallocatedBalance, account.currency)} unallocated`,
      })),
    [eligibleAccounts]
  );

  function getSubmitButtonText({
    isPending,
    isEditing,
  }: {
    isPending: boolean;
    isEditing: boolean;
  }): string {
    if (isPending) {
      return isEditing ? 'Saving…' : 'Adding contribution…';
    }
    return isEditing ? 'Save changes' : 'Add contribution';
  }

  function clearFormError() {
    setFormError(null);
    createContribution.reset();
    updateContribution.reset();
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

  function handleAccountChange(onChange: (value: string) => void) {
    return withClearedError((option: AccountOption | null) => {
      onChange(option?.value ?? '');
    });
  }

  function handleMutationError(error: Error) {
    setFormError(getGoalMutationErrorMessage(error));
  }

  function handleSubmit({ value }: { value: FormState }) {
    if (isEditing) {
      updateContribution.mutate(
        { id: contribution.id, accountId: value.accountId, amount: value.amount.trim() },
        { onSuccess: () => onSuccess?.(), onError: handleMutationError }
      );
      return;
    }

    createContribution.mutate(
      { goalId: goal.id, accountId: value.accountId, amount: value.amount.trim() },
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
      accountId: contribution?.accountId ?? '',
      amount: contribution?.amount ?? '',
    } satisfies FormState,
    validators: {
      onSubmit: contributionFormSchema,
    },
    onSubmit: handleSubmit,
  });

  if (eligibleAccounts.length === 0) {
    return (
      <FormError
        message={`You need a ${goal.currency} account with an unallocated balance before you can contribute to this goal.`}
      />
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-5" noValidate>
      {formError && <FormError message={formError} />}

      <Field.Group>
        <FormField form={form} name="accountId" label="From account" disabled={isPending}>
          {(fieldProps) => {
            const selectedOption =
              accountOptions.find((option) => option.value === fieldProps.value) ?? null;

            return (
              <Combobox
                items={accountOptions}
                value={selectedOption}
                onValueChange={handleAccountChange(fieldProps.onChange)}
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
              currency={goal.currency}
              placeholder="0.00"
              onChange={handleAmountChange(fieldProps.onChange)}
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
