import { MobileLayout } from '~/components/layouts/MobileLayout';
import { Button } from '~/components/ui/button';
import { useQuery } from '~/lib/react-query';
import { accountsOptions } from '~/gateways/accounts';
import { transactionsOptions } from '~/gateways/transactions';
import { AccountSummary } from '~/features/accounts';
import { TransactionList } from '~/features/transactions';
import { Mic } from 'lucide-react';

export function DashboardPage() {
  const { data: accounts, isLoading: accountsLoading } = useQuery(accountsOptions());
  const { data: transactions, isLoading: transactionsLoading } = useQuery(transactionsOptions());

  return (
    <MobileLayout
      title="Dashboard"
      actions={
        <Button size="icon" variant="outline" aria-label="Voice entry">
          <Mic className="h-4 w-4" />
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {accountsLoading || !accounts ? (
          <p className="text-muted-foreground">Loading accounts...</p>
        ) : (
          <AccountSummary accounts={accounts} onSelect={(id) => console.log('account', id)} />
        )}

        {transactionsLoading || !transactions ? (
          <p className="text-muted-foreground">Loading transactions...</p>
        ) : (
          <TransactionList transactions={transactions} onSelect={(id) => console.log('transaction', id)} />
        )}
      </div>
    </MobileLayout>
  );
}
