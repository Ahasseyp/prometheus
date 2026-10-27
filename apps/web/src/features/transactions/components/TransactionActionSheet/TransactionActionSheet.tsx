import { Button } from '@/components/ui/button.js';
import { Sheet } from '@/components/ui/sheet.js';
import { formatMoney } from '@/lib/format-money.js';

import type { Transaction } from '@/features/transactions/gateways/transactions.js';

export interface TransactionActionSheetProps {
  transaction: Transaction | null;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

// Mobile home for row actions: the cards are display-only, so Edit and Delete
// live here, reachable by tapping a card.
export function TransactionActionSheet({
  transaction,
  onClose,
  onEdit,
  onDelete,
}: TransactionActionSheetProps) {
  if (transaction === null) {
    return null;
  }

  const label = transaction.description || transaction.categoryName;

  return (
    <Sheet open={true} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <Sheet.Content side="bottom">
        <Sheet.Header>
          <Sheet.Title>{label}</Sheet.Title>
          <Sheet.Description>
            {formatMoney(
              transaction.type === 'expense' ? `-${transaction.amount}` : transaction.amount,
              transaction.accountCurrency
            )}
            {' · '}
            {transaction.categoryName}
          </Sheet.Description>
        </Sheet.Header>
        <div className="flex flex-col gap-2 px-4 pb-4">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              onEdit(transaction);
            }}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onClose();
              onDelete(transaction);
            }}
          >
            Delete
          </Button>
        </div>
      </Sheet.Content>
    </Sheet>
  );
}
