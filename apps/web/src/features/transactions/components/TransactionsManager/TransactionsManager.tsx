import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { useAccounts } from '@/features/accounts/gateways/accounts.js';
import { TransactionFilters } from '@/features/transactions/components/TransactionFilters/TransactionFilters.js';
import { TransactionFormDialog } from '@/features/transactions/components/TransactionFormDialog/TransactionFormDialog.js';
import { TransactionList } from '@/features/transactions/components/TransactionList/TransactionList.js';
import {
  useTransactions,
  type TransactionFilters as Filters,
} from '@/features/transactions/gateways/transactions.js';

export function TransactionsManager() {
  const { data: accounts } = useAccounts();
  const [filters, setFilters] = useState<Filters>({});
  const { data: transactions, isPending, isError, refetch } = useTransactions(filters);
  const [formOpen, setFormOpen] = useState(false);
  const isFiltered =
    filters.accountId !== undefined || filters.from !== undefined || filters.to !== undefined;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus data-icon="inline-start" />
          Add transaction
        </Button>
      </header>

      <TransactionFilters accounts={accounts} value={filters} onChange={setFilters} />

      <Card>
        <Card.Content flush>
          <TransactionList
            transactions={transactions}
            isLoading={isPending}
            isError={isError}
            onRetry={() => void refetch()}
            isFiltered={isFiltered}
            emptyAction={() => setFormOpen(true)}
          />
        </Card.Content>
      </Card>

      <TransactionFormDialog open={formOpen} onOpenChange={setFormOpen} accounts={accounts} />
    </div>
  );
}
