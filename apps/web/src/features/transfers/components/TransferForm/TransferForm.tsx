import type { Account } from '@/features/accounts/gateways/accounts.js';
import type { Transfer } from '@/features/transfers/gateways/transfers.js';

export interface TransferFormProps {
  accounts?: Account[];
  transfer?: Transfer;
  onSuccess: () => void;
}

// Stub body — replaced by the real form in slice 2 (issue #26).
export function TransferForm({ accounts, transfer, onSuccess }: TransferFormProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed p-4">
      <p className="font-medium">TransferForm (stub)</p>
      <p className="text-muted-foreground text-sm">
        accounts:{' '}
        {accounts?.map((account) => `${account.name} (${account.currency})`).join(', ') ?? 'none'}
      </p>
      <p className="text-muted-foreground text-sm">
        transfer: {transfer ? transfer.id : 'none (create mode)'}
      </p>
      <button type="button" className="text-primary text-sm underline" onClick={onSuccess}>
        Simulate success (close)
      </button>
    </div>
  );
}
