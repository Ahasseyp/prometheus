import { Skeleton } from '@/components/ui/skeleton.js';

export interface CategoryListSkeletonProps {
  rows?: number;
}

export function CategoryListSkeleton({ rows = 8 }: CategoryListSkeletonProps) {
  return (
    <div className="flex flex-col px-4" aria-label="Loading categories">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-3 border-b py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}
