import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { DropdownMenu } from '@/components/ui/dropdown-menu.js';

import { ACCOUNT_TYPE_META } from '@/features/accounts/lib/account-types.js';
import { signedMinorUnits } from '@/features/accounts/lib/account-totals.js';
import { formatMinorUnits, formatMoney, getCurrencyExponent } from '@/lib/format-money.js';
import { decimalStringToMinorUnits } from '@/lib/money-parser.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import { cn } from '@/lib/utils.js';

export interface AccountRowProps {
  account: Account;
  convertedBalance?: string | null;
  reportingCurrency?: string;
  onEdit?: (account: Account) => void;
  onDelete?: (account: Account) => void;
}

export function AccountRow({
  account,
  convertedBalance,
  reportingCurrency,
  onEdit,
  onDelete,
}: AccountRowProps) {
  const meta = ACCOUNT_TYPE_META[account.type];
  const Icon = meta.icon;
  const signedBalance = signedMinorUnits(account);
  const showConverted = reportingCurrency !== undefined;
  const isConversionUnavailable = showConverted && convertedBalance == null;
  const isNegative = showConverted ? convertedBalance?.startsWith('-') : signedBalance < 0n;
  const displayedBalance = isConversionUnavailable
    ? 'Rate unavailable'
    : showConverted && convertedBalance != null
      ? formatMoney(convertedBalance, reportingCurrency)
      : formatMinorUnits(signedBalance, account.currency);
  const showActions = onEdit !== undefined && onDelete !== undefined;
  // Goal Contributions earmark part of the Balance; the subline only appears
  // in Account-currency mode so it never competes with the converted balance.
  const exponent = getCurrencyExponent(account.currency);
  const earmarkedMinorUnits = decimalStringToMinorUnits(account.earmarkedBalance, exponent);
  const unallocatedMinorUnits = decimalStringToMinorUnits(account.unallocatedBalance, exponent);
  const showAllocationSplit = !showConverted && earmarkedMinorUnits > 0n;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{account.name}</p>
          <p className="text-xs text-muted-foreground">{meta.label}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <div className="flex flex-col items-end gap-0.5">
          <p
            className={cn(
              'text-sm font-semibold',
              // The minus sign comes from the currency formatting; color is only a
              // reinforcement so the state never relies on color alone.
              isNegative ? 'text-destructive' : 'text-foreground'
            )}
          >
            {displayedBalance}
          </p>
          {showAllocationSplit && (
            <p className="text-xs text-muted-foreground">
              {formatMinorUnits(unallocatedMinorUnits, account.currency)} unallocated ·{' '}
              {formatMinorUnits(earmarkedMinorUnits, account.currency)} earmarked
            </p>
          )}
        </div>
        {showActions && (
          <DropdownMenu>
            <DropdownMenu.Trigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${account.name}`} />
              }
            >
              <EllipsisVertical aria-hidden="true" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Group>
                <DropdownMenu.Item onClick={() => onEdit(account)}>
                  <Pencil aria-hidden="true" />
                  Edit
                </DropdownMenu.Item>
                <DropdownMenu.Item variant="destructive" onClick={() => onDelete(account)}>
                  <Trash2 aria-hidden="true" />
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Group>
            </DropdownMenu.Content>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
