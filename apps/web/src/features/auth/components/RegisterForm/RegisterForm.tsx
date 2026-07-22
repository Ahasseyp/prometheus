import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { passwordSchema } from '@prometheus/domain';
import { z } from 'zod';

import { Button } from '@/components/ui/button.js';
import { FieldGroup } from '@/components/ui/field.js';
import { Spinner } from '@/components/ui/spinner.js';
import { Input } from '@/components/ui/input.js';
import { PasswordInput } from '@/components/molecules/PasswordInput/PasswordInput.js';
import { useRegister, type RegisterOutput } from '@/features/auth/gateways/registration.js';

import { FormError } from '@/components/form/FormError.js';
import { FormField } from '@/components/form/FormField.js';

type FormState = {
  email: string;
  password: string;
  confirmPassword: string;
};

const registrationFormSchema = z
  .object({
    email: z.string().min(1, 'Enter your email address.').email('Enter a valid email address.'),
    password: z.string().min(1, 'Enter a password.').pipe(passwordSchema),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export interface RegisterFormProps {
  onSuccess?: (email: string) => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { mutate, isPending, reset } = useRegister();
  const [formError, setFormError] = useState<string | null>(null);

  function clearFormError() {
    setFormError(null);
    reset();
  }

  function handleRegisterSuccess(result: RegisterOutput) {
    if (result.ok) {
      onSuccess?.(result.user.email);
      return;
    }

    if (result.error === 'email-already-exists') {
      setFormError('An account with this email already exists. Sign in instead.');
    } else if (result.error === 'registration-disabled') {
      setFormError('Registration is currently disabled.');
    }
  }

  function handleRegisterError() {
    setFormError('Something went wrong. Please check your connection and try again.');
  }

  function handleSubmit({ value }: { value: FormState }) {
    mutate(
      { email: value.email.trim(), password: value.password },
      {
        onSuccess: handleRegisterSuccess,
        onError: handleRegisterError,
      }
    );
  }

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    } satisfies FormState,
    validators: {
      onSubmit: registrationFormSchema,
    },
    onSubmit: handleSubmit,
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      {formError && <FormError message={formError} />}

      <FieldGroup>
        <FormField form={form} name="email" label="Email" disabled={isPending}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              onChange={(event) => {
                fieldProps.onChange(event.target.value);
                clearFormError();
              }}
            />
          )}
        </FormField>

        <FormField
          form={form}
          name="password"
          label="Password"
          disabled={isPending}
          description="Use at least 12 characters with uppercase, lowercase, number, and special character."
        >
          {(fieldProps) => (
            <PasswordInput
              {...fieldProps}
              autoComplete="new-password"
              onChange={(event) => {
                fieldProps.onChange(event.target.value);
                clearFormError();
              }}
            />
          )}
        </FormField>

        <FormField form={form} name="confirmPassword" label="Confirm password" disabled={isPending}>
          {(fieldProps) => (
            <PasswordInput
              {...fieldProps}
              autoComplete="new-password"
              onChange={(event) => {
                fieldProps.onChange(event.target.value);
                clearFormError();
              }}
            />
          )}
        </FormField>
      </FieldGroup>

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Spinner data-icon="inline-start" />
            Creating account…
          </>
        ) : (
          'Create account'
        )}
      </Button>
    </form>
  );
}
