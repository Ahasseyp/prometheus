import { AccountCard } from '~/features/accounts/components/AccountCard';

export interface AccountSummaryProps {
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: { amount: number; currency: 'MXN' | 'USD' };
  }>;
  onSelect?: (id: string) => void;
}

export function AccountSummary({ accounts, onSelect }: AccountSummaryProps) {
  return (
    <section className="flex flex-col">
      <h2 className="mb-2 text-lg font-semibold">Accounts</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            name={account.name}
            type={account.type}
            balance={account.balance}
            onClick={() => onSelect?.(account.id)}
          />
        ))}
      </div>
    </section>
  );
}
