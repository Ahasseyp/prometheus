import { format } from 'date-fns';
import { isContributionFundingType } from '@prometheus/domain';

import type { Account } from '@/features/accounts/gateways/accounts.js';
import type { Goal } from '@/features/goals/gateways/goals.js';
import { formatMoney, getCurrencyExponent } from '@/lib/format-money.js';
import { decimalStringToMinorUnits } from '@/lib/money-parser.js';

export function getGoalDeadlineLabel(deadline: string): string {
  return format(new Date(deadline), 'MMM d, yyyy');
}

export function getContributionDateLabel(createdAt: string): string {
  return format(new Date(createdAt), 'MMM d, yyyy');
}

export function getGoalSavedLabel(savedAmount: string, target: string, currency: string): string {
  return `${formatMoney(savedAmount, currency)} of ${formatMoney(target, currency)} saved`;
}

export function getGoalProgressPercent(
  savedAmount: string,
  target: string,
  currency: string
): number {
  const exponent = getCurrencyExponent(currency);
  const savedMinorUnits = decimalStringToMinorUnits(savedAmount, exponent);
  const targetMinorUnits = decimalStringToMinorUnits(target, exponent);
  if (targetMinorUnits <= 0n) {
    return savedMinorUnits > 0n ? 100 : 0;
  }
  const percent = (savedMinorUnits * 100n) / targetMinorUnits;
  return Number(percent > 100n ? 100n : percent);
}

// Funding Accounts must share the Goal Currency and hold money the
// Household actually has — debt Accounts (credit card, loan) can't fund a
// Goal (issue #28).
export function getEligibleFundingAccounts(
  accounts: Account[],
  goal: Pick<Goal, 'currency'>
): Account[] {
  return accounts.filter(
    (account) => account.currency === goal.currency && isContributionFundingType(account.type)
  );
}
