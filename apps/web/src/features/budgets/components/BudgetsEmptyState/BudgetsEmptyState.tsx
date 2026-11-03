import { Empty } from '@/components/ui/empty.js';

export function BudgetsEmptyState() {
  return (
    <Empty>
      <Empty.Header>
        <Empty.Title>No budgets yet</Empty.Title>
        <Empty.Description>Create a budget to track spending by Category.</Empty.Description>
      </Empty.Header>
    </Empty>
  );
}
