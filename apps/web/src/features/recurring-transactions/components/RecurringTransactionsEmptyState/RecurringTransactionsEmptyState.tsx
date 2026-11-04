import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { Empty } from '@/components/ui/empty.js';

export interface RecurringTransactionsEmptyStateProps {
  onAdd?: () => void;
}

export function RecurringTransactionsEmptyState({ onAdd }: RecurringTransactionsEmptyStateProps) {
  return (
    <Empty>
      <Empty.Header>
        <Empty.Title>No recurring transactions yet</Empty.Title>
        <Empty.Description>
          Set up a schedule to generate income or expense transactions automatically.
        </Empty.Description>
      </Empty.Header>
      {onAdd && (
        <Empty.Content>
          <Button onClick={onAdd}>
            <Plus data-icon="inline-start" />
            Add recurring transaction
          </Button>
        </Empty.Content>
      )}
    </Empty>
  );
}
