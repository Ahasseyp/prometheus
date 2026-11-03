import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export function getTransactionIcon(isExpense: boolean) {
  return isExpense ? ArrowUpRight : ArrowDownLeft;
}

export function getSignedTransactionAmount(isExpense: boolean, amount: string): string {
  return isExpense ? `-${amount}` : amount;
}
