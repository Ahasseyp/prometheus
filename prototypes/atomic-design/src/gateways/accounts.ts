import { queryOptions } from '~/lib/react-query';
import type { Money } from '~/domain/money';

export interface AccountDto {
  id: string;
  name: string;
  type: string;
  balance: Money;
}

const MOCK_ACCOUNTS: AccountDto[] = [
  { id: '1', name: 'BBVA Checking', type: 'Checking', balance: { amount: 24500.75, currency: 'MXN' } },
  { id: '2', name: 'Amex Gold', type: 'Credit card', balance: { amount: -1240.0, currency: 'MXN' } },
  { id: '3', name: 'US Salary', type: 'Savings', balance: { amount: 8400.0, currency: 'USD' } },
];

export async function fetchAccounts(): Promise<AccountDto[]> {
  return Promise.resolve(MOCK_ACCOUNTS);
}

const accountKeys = {
  all: () => ['account'] as const,
  lists: () => [...accountKeys.all(), 'list'] as const,
  list: () => [...accountKeys.lists(), { filters: {} }] as const,
};

export function accountsOptions() {
  return queryOptions({
    queryKey: accountKeys.list(),
    queryFn: fetchAccounts,
  });
}
