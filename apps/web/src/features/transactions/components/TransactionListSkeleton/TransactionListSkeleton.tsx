import { Skeleton } from '@/components/ui/skeleton.js';
import { Table } from '@/components/ui/table.js';
import { TransactionTableHead } from '@/features/transactions/components/TransactionTableHead/TransactionTableHead.js';

export interface TransactionListSkeletonProps {
  rows?: number;
  cards?: boolean;
}

export function TransactionListSkeleton({ rows = 5, cards = false }: TransactionListSkeletonProps) {
  if (cards) {
    return (
      <div className="flex flex-col gap-3" aria-label="Loading transactions">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-lg border p-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Table aria-label="Loading transactions">
      <TransactionTableHead />
      <Table.Body>
        {Array.from({ length: rows }, (_, index) => (
          <Table.Row key={index}>
            <Table.Cell>
              <Skeleton className="h-4 w-24" />
            </Table.Cell>
            <Table.Cell>
              <Skeleton className="h-4 w-40" />
            </Table.Cell>
            <Table.Cell>
              <Skeleton className="h-4 w-20" />
            </Table.Cell>
            <Table.Cell>
              <Skeleton className="h-4 w-24" />
            </Table.Cell>
            <Table.Cell className="text-right">
              <Skeleton className="ml-auto h-4 w-20" />
            </Table.Cell>
            <Table.Cell>
              <Skeleton className="ml-auto size-8" />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
