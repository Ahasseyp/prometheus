import { Skeleton } from '@/components/ui/skeleton.js';
import { Table } from '@/components/ui/table.js';

export interface RecurringTransactionListSkeletonProps {
  rows?: number;
}

export function RecurringTransactionListSkeleton({
  rows = 5,
}: RecurringTransactionListSkeletonProps) {
  return (
    <Table aria-label="Loading recurring transactions">
      <Table.Header>
        <Table.Row>
          <Table.Head>Schedule</Table.Head>
          <Table.Head>Account</Table.Head>
          <Table.Head>Repeats</Table.Head>
          <Table.Head>Next occurrence</Table.Head>
          <Table.Head className="text-right">Amount</Table.Head>
          <Table.Head>
            <span className="sr-only">Actions</span>
          </Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {Array.from({ length: rows }, (_, index) => (
          <Table.Row key={index}>
            <Table.Cell>
              <Skeleton className="h-4 w-40" />
            </Table.Cell>
            <Table.Cell>
              <Skeleton className="h-4 w-32" />
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
              <Skeleton className="ml-auto h-8 w-8 rounded-full" />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
