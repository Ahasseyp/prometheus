import { Table } from '@/components/ui/table.js';

export function TransactionTableHead() {
  return (
    <Table.Header>
      <Table.Row>
        <Table.Head>Date</Table.Head>
        <Table.Head>Description</Table.Head>
        <Table.Head>Category</Table.Head>
        <Table.Head>Account</Table.Head>
        <Table.Head className="text-right">Amount</Table.Head>
      </Table.Row>
    </Table.Header>
  );
}
