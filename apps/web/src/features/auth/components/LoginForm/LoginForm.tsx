import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button.js';
import { FieldGroup } from '@/components/ui/field.js';
import { Spinner } from '@/components/ui/spinner.js';
import { Input } from '@/components/ui/input.js';
import { PasswordInput } from '@/components/molecules/PasswordInput/PasswordInput.js';
import { useLogin, type LoginOutput } from '@/features/auth/gateways/auth.js';

import { FormError } from '@/components/form/FormError.js';
import { FormField } from '@/components/form/FormField.js';

type FormState = {
  email: string;
  password: string;
};

const loginFormSchema = z.object({
  email: z.string().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter a password.'),
});

export interface LoginFormProps {
  onSuccess?: (user: Extract<LoginOutput, { ok: true }>['user']) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { mutate, isPending, reset } = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  function clearFormError() {
    setFormError(null);
    reset();
  }

  function handleLoginSuccess(result: LoginOutput) {
    if (result.ok) {
      onSuccess?.(result.user);
      return;
    }

    if (result.error === 'invalid-credentials') {
      setFormError('Incorrect email or password.');
    }
  }

  function handleLoginError() {
    setFormError('Something went wrong. Please check your connection and try again.');
  }

  function handleSubmit({ value }: { value: FormState }) {
    mutate(
      { email: value.email.trim(), password: value.password },
      {
        onSuccess: handleLoginSuccess,
        onError: handleLoginError,
      }
    );
  }

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    } satisfies FormState,
    validators: {
      onSubmit: loginFormSchema,
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

        <FormField form={form} name="password" label="Password" disabled={isPending}>
          {(fieldProps) => (
            <PasswordInput
              {...fieldProps}
              autoComplete="current-password"
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
            Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  );
}
