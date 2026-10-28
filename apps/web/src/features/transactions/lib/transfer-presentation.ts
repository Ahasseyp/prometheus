import type { Transaction } from '@/features/transactions/gateways/transactions.js';

// Returns the detail line shown beside the amount: a "Transfer · to/from X"
// label for linked Transfer Transactions, otherwise the Category name. Linked
// Transfer Transactions have no Category, and the direction is relative to the
// Account whose list the row appears in (expense side = money out).
export function getTransactionDetailLabel(transaction: Transaction): string | null {
  const transfer = transaction.transfer;
  if (transfer === null) {
    return transaction.categoryName;
  }

  const direction = transaction.type === 'expense' ? 'to' : 'from';

  return `Transfer · ${direction} ${transfer.counterpartyAccountName}`;
}
