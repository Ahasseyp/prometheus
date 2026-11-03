import { Skeleton } from '@/components/ui/skeleton.js';

type BudgetListSkeletonProps = {
  rows?: number;
  cards?: boolean;
};

export function BudgetListSkeleton({ rows = 3, cards = false }: BudgetListSkeletonProps) {
  if (cards) {
    return (
      <div className="grid gap-4" aria-label="Loading budgets">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-44 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4" aria-label="Loading budgets">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12" />
      ))}
    </div>
  );
}
