import { AlertCircle } from 'lucide-react';

import { Alert } from '@/components/ui/alert.js';
import { Button } from '@/components/ui/button.js';

type RecurringTransactionsErrorStateProps = {
  title: string;
  onRetry: () => void;
};

export function RecurringTransactionsErrorState({
  title,
  onRetry,
}: RecurringTransactionsErrorStateProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden="true" />
      <Alert.Title>{title}</Alert.Title>
      <Alert.Description>Check your connection and try again.</Alert.Description>
      <Alert.Action>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </Alert.Action>
    </Alert>
  );
}
