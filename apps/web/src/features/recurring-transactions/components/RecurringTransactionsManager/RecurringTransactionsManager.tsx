import { Empty } from '@/components/ui/empty.js';

export function RecurringTransactionsManager() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Recurring Transactions</h1>
      </header>
      <Empty>
        <Empty.Header>
          <Empty.Title>RecurringTransactionsManager</Empty.Title>
          <Empty.Description>Schedule list and management forms are coming next.</Empty.Description>
        </Empty.Header>
      </Empty>
    </div>
  );
}
