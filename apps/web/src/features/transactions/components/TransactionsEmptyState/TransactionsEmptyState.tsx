import { Plus, Receipt } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { Empty } from '@/components/ui/empty.js';

export interface TransactionsEmptyStateProps {
  filtered: boolean;
  onAddTransaction?: () => void;
}

export function TransactionsEmptyState({
  filtered,
  onAddTransaction,
}: TransactionsEmptyStateProps) {
  return (
    <Empty>
      <Empty.Header>
        <Empty.Media variant="icon">
          <Receipt aria-hidden="true" />
        </Empty.Media>
        <Empty.Title>{filtered ? 'No transactions match' : 'No transactions yet'}</Empty.Title>
        <Empty.Description>
          {filtered
            ? 'Try widening the date range or choosing a different account.'
            : 'Record an income or expense to start tracking your money.'}
        </Empty.Description>
      </Empty.Header>
      {!filtered && onAddTransaction && (
        <Empty.Content>
          <Button onClick={onAddTransaction}>
            <Plus data-icon="inline-start" />
            Add transaction
          </Button>
        </Empty.Content>
      )}
    </Empty>
  );
}
