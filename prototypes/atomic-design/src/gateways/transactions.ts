import { queryOptions } from '~/lib/react-query';
import type { Money } from '~/domain/money';

export interface TransactionDto {
  id: string;
  description: string;
  amount: Money;
  category: { name: string; color?: string };
  date: string;
}

const MOCK_TRANSACTIONS: TransactionDto[] = [
  {
    id: '1',
    description: 'Superama groceries',
    amount: { amount: -1240.5, currency: 'MXN' },
    category: { name: 'Groceries', color: '#16a34a' },
    date: 'Today',
  },
  {
    id: '2',
    description: 'Monthly salary',
    amount: { amount: 5000.0, currency: 'USD' },
    category: { name: 'Income', color: '#059669' },
    date: 'Yesterday',
  },
  {
    id: '3',
    description: 'Uber ride',
    amount: { amount: -145.0, currency: 'MXN' },
    category: { name: 'Transport', color: '#2563eb' },
    date: 'Jul 12',
  },
];

export async function fetchTransactions(): Promise<TransactionDto[]> {
  return Promise.resolve(MOCK_TRANSACTIONS);
}

const transactionKeys = {
  all: () => ['transaction'] as const,
  lists: () => [...transactionKeys.all(), 'list'] as const,
  list: () => [...transactionKeys.lists(), { filters: {} }] as const,
};

export function transactionsOptions() {
  return queryOptions({
    queryKey: transactionKeys.list(),
    queryFn: fetchTransactions,
  });
}
