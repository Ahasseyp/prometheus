import { Skeleton } from '@/components/ui/skeleton.js';

export interface AccountListSkeletonProps {
  rows?: number;
}

export function AccountListSkeleton({ rows = 3 }: AccountListSkeletonProps) {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading accounts">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
