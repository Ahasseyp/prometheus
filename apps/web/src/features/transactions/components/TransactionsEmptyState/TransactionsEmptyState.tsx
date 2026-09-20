import { Receipt } from 'lucide-react';

import { Empty } from '@/components/ui/empty.js';

export interface TransactionsEmptyStateProps {
  filtered: boolean;
}

export function TransactionsEmptyState({ filtered }: TransactionsEmptyStateProps) {
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
            : 'Income and expenses you record will show up here.'}
        </Empty.Description>
      </Empty.Header>
    </Empty>
  );
}
