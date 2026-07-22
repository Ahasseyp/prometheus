import type { ReactNode } from 'react';
import { Field as TanStackField } from '@tanstack/react-form';
import type { AnyFieldApi, AnyFormApi } from '@tanstack/react-form';

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field.js';

type FieldInputProps = {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  'aria-invalid': boolean;
  disabled: boolean;
};

export type FormFieldProps = {
  form: AnyFormApi;
  name: string;
  label: string;
  children: (props: FieldInputProps) => ReactNode;
  description?: ReactNode;
  disabled?: boolean;
};

function getFieldErrorMessages(errors: unknown[]): Array<{ message?: string }> {
  return errors.map((error) => ({
    message:
      typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : undefined,
  }));
}

export function FormField({
  form,
  name,
  label,
  children,
  description,
  disabled = false,
}: FormFieldProps) {
  return (
    <TanStackField form={form} name={name}>
      {(field: AnyFieldApi) => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

        return (
          <Field data-invalid={isInvalid} data-disabled={disabled}>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            {children({
              id: field.name,
              name: field.name,
              value: field.state.value as string,
              onChange: (value) => field.handleChange(value),
              onBlur: field.handleBlur,
              'aria-invalid': isInvalid,
              disabled,
            })}
            {isInvalid ? (
              <FieldError errors={getFieldErrorMessages(field.state.meta.errors)} />
            ) : (
              description && <FieldDescription>{description}</FieldDescription>
            )}
          </Field>
        );
      }}
    </TanStackField>
  );
}
