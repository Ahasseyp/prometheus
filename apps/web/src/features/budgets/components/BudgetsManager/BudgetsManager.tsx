import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { cn } from '@/lib/utils.js';

type StubProps = {
  name: string;
  className?: string;
};

function Stub({ name, className }: StubProps) {
  return (
    <div
      className={cn(
        'flex min-h-28 items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-center',
        className
      )}
    >
      <div>
        <p className="font-medium text-foreground">{name}</p>
        <p className="text-sm text-muted-foreground">Layout placeholder</p>
      </div>
    </div>
  );
}

export function BudgetsManager() {
  const [createStubVisible, setCreateStubVisible] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        <Button onClick={() => setCreateStubVisible(true)}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Add budget
        </Button>
      </header>

      <Card>
        <Card.Header>
          <Card.Title>Current period</Card.Title>
          <Card.Description>Track spending limits by Category.</Card.Description>
        </Card.Header>
        <Card.Content className="flex min-h-[28rem] flex-col gap-4">
          <div className="grid gap-4 md:hidden">
            <Stub name="BudgetCard" className="min-h-40" />
          </div>
          <div className="hidden flex-1 md:block">
            <Stub name="BudgetList" className="min-h-72" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stub name="BudgetsLoadingState" />
            <Stub name="BudgetsEmptyState" />
            <Stub name="BudgetsErrorState" />
          </div>
          {createStubVisible && <Stub name="BudgetFormDialog" className="min-h-32" />}
        </Card.Content>
      </Card>
    </div>
  );
}
