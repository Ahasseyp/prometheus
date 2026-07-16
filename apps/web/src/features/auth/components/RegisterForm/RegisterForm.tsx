import { useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { passwordSchema } from '@prometheus/domain';
import { AlertCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/button.js';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field.js';
import { Input } from '@/components/ui/input.js';
import { PasswordInput } from '@/components/molecules/PasswordInput/index.js';
import { useRegister, type RegisterOutput } from '@/features/auth/gateways/registration.js';

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
  const formErrorRef = useRef<HTMLDivElement>(null);

  function clearFormError() {
    setFormError((currentError) => {
      const hasError = currentError !== null;
      return hasError ? null : currentError;
    });
    reset();
  }

  function focusFormError() {
    setTimeout(() => formErrorRef.current?.focus(), 0);
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

    focusFormError();
  }

  function handleRegisterError() {
    setFormError('Something went wrong. Please check your connection and try again.');
    focusFormError();
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
      {formError && (
        <div
          ref={formErrorRef}
          tabIndex={-1}
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      <FieldGroup>
        <form.Field
          name="email"
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  autoComplete="email"
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFormError();
                  }}
                  onBlur={field.handleBlur}
                  aria-invalid={isInvalid}
                  disabled={isPending}
                  placeholder="you@example.com"
                />
                {isInvalid && (
                  <FieldError errors={field.state.meta.errors as Array<{ message?: string }>} />
                )}
              </Field>
            );
          }}
        />

        <form.Field
          name="password"
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                <PasswordInput
                  id={field.name}
                  name={field.name}
                  autoComplete="new-password"
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFormError();
                  }}
                  onBlur={field.handleBlur}
                  aria-invalid={isInvalid}
                  disabled={isPending}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors as Array<{ message?: string }>} />
                ) : (
                  <FieldDescription>
                    Use at least 12 characters with uppercase, lowercase, number, and special
                    character.
                  </FieldDescription>
                )}
              </Field>
            );
          }}
        />

        <form.Field
          name="confirmPassword"
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Confirm password</FieldLabel>
                <PasswordInput
                  id={field.name}
                  name={field.name}
                  autoComplete="new-password"
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFormError();
                  }}
                  onBlur={field.handleBlur}
                  aria-invalid={isInvalid}
                  disabled={isPending}
                />
                {isInvalid && (
                  <FieldError errors={field.state.meta.errors as Array<{ message?: string }>} />
                )}
              </Field>
            );
          }}
        />
      </FieldGroup>

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Creating account…
          </>
        ) : (
          'Create account'
        )}
      </Button>
    </form>
  );
}
