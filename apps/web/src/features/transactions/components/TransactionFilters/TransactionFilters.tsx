import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import { DateRangePicker } from '@/components/molecules/DatePicker/DateRangePicker.js';
import { Select } from '@/components/ui/select.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';

import type { TransactionFilters } from '@/features/transactions/gateways/transactions.js';

export interface TransactionFiltersProps {
  accounts?: Account[];
  value: TransactionFilters;
  onChange: (value: TransactionFilters) => void;
}

// Filters cross the API as `yyyy-MM-dd` strings; the range picker works in
// Dates, so convert at the boundary (local time, not UTC midnight).
function parseFilterDate(value: string | undefined): Date | undefined {
  if (value === undefined) {
    return undefined;
  }
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toFilterDate(date: Date | undefined): string | undefined {
  return date === undefined ? undefined : format(date, 'yyyy-MM-dd');
}

export function TransactionFilters({ accounts, value, onChange }: TransactionFiltersProps) {
  const selectedAccount = accounts?.find((account) => account.id === value.accountId);
  const dateRange: DateRange | undefined =
    value.from !== undefined || value.to !== undefined
      ? { from: parseFilterDate(value.from), to: parseFilterDate(value.to) }
      : undefined;

  function handleRangeChange(range: DateRange | undefined) {
    onChange({ ...value, from: toFilterDate(range?.from), to: toFilterDate(range?.to) });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={value.accountId ?? ''}
        onValueChange={(accountId) =>
          onChange({
            ...value,
            accountId: accountId == null || accountId === '' ? undefined : accountId,
          })
        }
      >
        <Select.Trigger aria-label="Filter by account" className="w-48">
          <Select.Value placeholder="All accounts">
            {selectedAccount ? selectedAccount.name : null}
          </Select.Value>
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            <Select.Item value="">All accounts</Select.Item>
            {accounts?.map((account) => (
              <Select.Item key={account.id} value={account.id}>
                {account.name}
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Content>
      </Select>
      <DateRangePicker
        aria-label="Filter by date range"
        placeholder="All dates"
        value={dateRange}
        onChange={handleRangeChange}
      />
    </div>
  );
}
