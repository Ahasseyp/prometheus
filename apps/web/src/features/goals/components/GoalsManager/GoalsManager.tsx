import type { Account } from '@/features/accounts/gateways/accounts.js';
import type { Goal } from '@/features/goals/gateways/goals.js';

export type GoalsManagerProps = {
  goals: Goal[] | undefined;
  accounts: Account[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

// Slice 4 stub: verifies placement, naming, and data flow before the real
// list and forms land. Replace region-by-region in later slices.
export function GoalsManager({ goals, accounts, isLoading, isError, onRetry }: GoalsManagerProps) {
  return (
    <div
      data-testid="goals-manager-stub"
      className="flex flex-col gap-2 rounded-lg border-2 border-dashed border-muted-foreground/40 p-6"
    >
      <p className="text-sm font-medium text-muted-foreground">GoalsManager</p>
      {isLoading ? (
        <p className="text-sm">Loading goals and accounts…</p>
      ) : isError ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-destructive">Could not load goals.</p>
          <button type="button" className="text-sm underline underline-offset-4" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : (
        <p className="text-sm">
          Received {goals?.length ?? 0} goal(s) and {accounts?.length ?? 0} account(s).
        </p>
      )}
    </div>
  );
}
