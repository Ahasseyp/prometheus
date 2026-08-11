import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.js';
import { AccountType } from '@prometheus/domain';

import { ACCOUNT_TYPE_META } from '@/features/accounts/lib/account-types.js';
import { formatMoney } from '@/features/accounts/lib/format-money.js';
import type { Account } from '@/features/accounts/gateways/accounts.js';
import { cn } from '@/lib/utils.js';

function negateBalance(balance: string): string {
  const trimmed = balance.trim();
  const isZero = /^-?0+(\.0+)?$/.test(trimmed);
  if (isZero) {
    return trimmed;
  }
  if (trimmed.startsWith('-')) {
    return trimmed.slice(1);
  }
  return `-${trimmed}`;
}

function getDisplayBalance(account: Account): string {
  if (account.type === AccountType.Loan) {
    return negateBalance(account.balance);
  }
  return account.balance;
}

export interface AccountRowProps {
  account: Account;
  onEdit?: (account: Account) => void;
  onDelete?: (account: Account) => void;
}

export function AccountRow({ account, onEdit, onDelete }: AccountRowProps) {
  const meta = ACCOUNT_TYPE_META[account.type];
  const Icon = meta.icon;
  const displayBalance = getDisplayBalance(account);
  const isNegative = displayBalance.startsWith('-');
  const showActions = onEdit !== undefined && onDelete !== undefined;

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
        <p
          className={cn(
            'text-sm font-semibold',
            // The minus sign comes from the currency formatting; color is only a
            // reinforcement so the state never relies on color alone.
            isNegative ? 'text-destructive' : 'text-foreground'
          )}
        >
          {formatMoney(displayBalance, account.currency)}
        </p>
        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${account.name}`} />
              }
            >
              <EllipsisVertical aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => onEdit(account)}>
                  <Pencil aria-hidden="true" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(account)}>
                  <Trash2 aria-hidden="true" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
