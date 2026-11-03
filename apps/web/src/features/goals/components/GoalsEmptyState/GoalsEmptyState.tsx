import { Empty } from '@/components/ui/empty.js';

export function GoalsEmptyState() {
  return (
    <Empty>
      <Empty.Header>
        <Empty.Title>No goals yet</Empty.Title>
        <Empty.Description>Create a goal to earmark savings from your accounts.</Empty.Description>
      </Empty.Header>
    </Empty>
  );
}
