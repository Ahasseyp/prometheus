import { TransactionRow } from '~/features/transactions/components/TransactionRow';

export interface TransactionListProps {
  transactions: Array<{
    id: string;
    description: string;
    amount: { amount: number; currency: 'MXN' | 'USD' };
    category: { name: string; color?: string };
    date: string;
  }>;
  onSelect?: (id: string) => void;
}

export function TransactionList({ transactions, onSelect }: TransactionListProps) {
  return (
    <section className="flex flex-col">
      <h2 className="mb-2 text-lg font-semibold">Recent transactions</h2>
      <div className="divide-y rounded-xl border bg-card">
        {transactions.map((t) => (
          <TransactionRow
            key={t.id}
            description={t.description}
            amount={t.amount}
            category={t.category}
            date={t.date}
            onClick={() => onSelect?.(t.id)}
          />
        ))}
      </div>
    </section>
  );
}
