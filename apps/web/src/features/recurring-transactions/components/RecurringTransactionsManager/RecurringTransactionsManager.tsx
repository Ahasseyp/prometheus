import { Card } from '@/components/ui/card.js';

import { useRecurringTransactions } from '@/features/recurring-transactions/gateways/recurring-transactions.js';
import { RecurringTransactionList } from '@/features/recurring-transactions/components/RecurringTransactionList/RecurringTransactionList.js';

export function RecurringTransactionsManager() {
  const { data: recurringTransactions, isPending, isError, refetch } = useRecurringTransactions();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Recurring Transactions</h1>
      </header>

      <Card>
        <Card.Content className="-my-(--card-spacing) px-0">
          <RecurringTransactionList
            recurringTransactions={recurringTransactions}
            isLoading={isPending}
            isError={isError}
            onRetry={() => void refetch()}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
