import { Skeleton } from '@/components/ui/skeleton.js';
import { Table } from '@/components/ui/table.js';
import { TransactionTableHead } from '@/features/transactions/components/TransactionTableHead/TransactionTableHead.js';

export interface TransactionListSkeletonProps {
  rows?: number;
}

export function TransactionListSkeleton({ rows = 5 }: TransactionListSkeletonProps) {
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
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
