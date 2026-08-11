import {
  ArrowLeftRight,
  LayoutDashboard,
  Monitor,
  Moon,
  PiggyBank,
  Plus,
  Sparkles,
  Sun,
  Target,
  Wallet,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { type Theme } from '@/components/theme-context.js';
import { useTheme } from '@/hooks/use-theme.js';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command.js';

type AssistantDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AssistantDialog({ open, onOpenChange }: AssistantDialogProps) {
  const navigate = useNavigate({ from: '/' });
  const { setTheme } = useTheme();

  const run = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  const navigateTo = (to: string) => {
    run(() => navigate({ to }));
  };

  const changeTheme = (value: Theme) => {
    run(() => setTheme(value));
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="add, ask, check, do…" />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem onSelect={() => run(() => {})}>
            <Plus className="mr-2 size-4" />
            Add a transaction
          </CommandItem>
          <CommandItem onSelect={() => run(() => {})}>
            <Sparkles className="mr-2 size-4" />
            Ask about your spending
          </CommandItem>
          <CommandItem onSelect={() => run(() => {})}>
            <PiggyBank className="mr-2 size-4" />
            Check budgets
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => navigateTo('/')}>
            <LayoutDashboard className="mr-2 size-4" />
            Overview
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('/accounts')}>
            <Wallet className="mr-2 size-4" />
            Accounts
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('/transactions')}>
            <ArrowLeftRight className="mr-2 size-4" />
            Transactions
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('/budgets')}>
            <PiggyBank className="mr-2 size-4" />
            Budgets
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('/goals')}>
            <Target className="mr-2 size-4" />
            Goals
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => changeTheme('light')}>
            <Sun className="mr-2 size-4" />
            Light
          </CommandItem>
          <CommandItem onSelect={() => changeTheme('dark')}>
            <Moon className="mr-2 size-4" />
            Dark
          </CommandItem>
          <CommandItem onSelect={() => changeTheme('system')}>
            <Monitor className="mr-2 size-4" />
            System
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
