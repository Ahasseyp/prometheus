import type { Transaction } from '@/features/transactions/gateways/transactions.js';
import { TransactionCard } from '@/features/transactions/components/TransactionCard/TransactionCard.js';

export interface TransactionCardsProps {
  transactions: Transaction[];
  onSelect: (transaction: Transaction) => void;
}

// Mobile layout: the card shows every Transaction field; its actions button
// opens the action sheet (there is no detail page to navigate to).
export function TransactionCards({ transactions, onSelect }: TransactionCardsProps) {
  return (
    <ul className="flex flex-col divide-border divide-y">
      {transactions.map((transaction) => (
        <TransactionCard key={transaction.id} transaction={transaction} onSelect={onSelect} />
      ))}
    </ul>
  );
}
