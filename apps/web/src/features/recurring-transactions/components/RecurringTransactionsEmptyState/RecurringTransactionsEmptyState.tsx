import { Empty } from '@/components/ui/empty.js';

export function RecurringTransactionsEmptyState() {
  return (
    <Empty>
      <Empty.Header>
        <Empty.Title>No recurring transactions yet</Empty.Title>
        <Empty.Description>
          Set up a schedule to generate income or expense transactions automatically.
        </Empty.Description>
      </Empty.Header>
    </Empty>
  );
}
