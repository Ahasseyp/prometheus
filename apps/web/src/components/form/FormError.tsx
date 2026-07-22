import { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert.js';

export interface FormErrorProps {
  message: string;
}

export function FormError({ message }: FormErrorProps) {
  const formErrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    formErrorRef.current?.focus();
  }, []);

  return (
    <Alert
      ref={formErrorRef}
      tabIndex={-1}
      variant="destructive"
      aria-live="assertive"
      className="items-start"
    >
      <AlertCircle className="mt-0.5 shrink-0" aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
