import {
  ArrowLeftRight,
  LayoutDashboard,
  PiggyBank,
  Plus,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { Command } from '@/components/ui/command.js';

type AssistantDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AssistantDialog({ open, onOpenChange }: AssistantDialogProps) {
  const navigate = useNavigate({ from: '/' });

  const run = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  const navigateTo = (to: string) => {
    run(() => navigate({ to }));
  };

  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange}>
      <Command.Input placeholder="add, ask, check, do…" />
      <Command.List>
        <Command.Empty>No commands found.</Command.Empty>
        <Command.Group heading="Suggestions">
          <Command.Item onSelect={() => run(() => {})}>
            <Plus className="mr-2 size-4" />
            Add a transaction
          </Command.Item>
          <Command.Item onSelect={() => run(() => {})}>
            <Sparkles className="mr-2 size-4" />
            Ask about your spending
          </Command.Item>
          <Command.Item onSelect={() => run(() => {})}>
            <PiggyBank className="mr-2 size-4" />
            Check budgets
          </Command.Item>
        </Command.Group>
        <Command.Separator />
        <Command.Group heading="Navigate">
          <Command.Item onSelect={() => navigateTo('/')}>
            <LayoutDashboard className="mr-2 size-4" />
            Overview
          </Command.Item>
          <Command.Item onSelect={() => navigateTo('/accounts')}>
            <Wallet className="mr-2 size-4" />
            Accounts
          </Command.Item>
          <Command.Item onSelect={() => navigateTo('/transactions')}>
            <ArrowLeftRight className="mr-2 size-4" />
            Transactions
          </Command.Item>
          <Command.Item onSelect={() => navigateTo('/budgets')}>
            <PiggyBank className="mr-2 size-4" />
            Budgets
          </Command.Item>
          <Command.Item onSelect={() => navigateTo('/goals')}>
            <Target className="mr-2 size-4" />
            Goals
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
