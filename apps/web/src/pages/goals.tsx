import { GoalsManager } from '@/features/goals/components/GoalsManager/GoalsManager.js';
import { useAccounts } from '@/features/accounts/gateways/accounts.js';
import { useGoals } from '@/features/goals/gateways/goals.js';

export function GoalsPage() {
  const goals = useGoals();
  const accounts = useAccounts();

  const isLoading = goals.isLoading || accounts.isLoading;
  const isError = goals.isError || accounts.isError;

  return (
    <>
      <h1 className="sr-only">Goals</h1>
      <GoalsManager
        goals={goals.data}
        accounts={accounts.data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => {
          void goals.refetch();
          void accounts.refetch();
        }}
      />
    </>
  );
}
