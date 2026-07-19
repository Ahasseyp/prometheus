import { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormErrorProps {
  message: string;
}

export function FormError({ message }: FormErrorProps) {
  const formErrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    formErrorRef.current?.focus();
  }, []);

  return (
    <div
      ref={formErrorRef}
      tabIndex={-1}
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
