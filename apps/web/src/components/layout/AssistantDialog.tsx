import * as React from 'react';
import {
  ArrowLeftRight,
  LayoutDashboard,
  Monitor,
  Moon,
  PiggyBank,
  Plus,
  Sparkles,
  Sun,
  Tags,
  Target,
  Wallet,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import type { DialogRoot } from '@base-ui/react/dialog';

import { type Theme } from '@/components/theme-context.js';
import { useTheme } from '@/hooks/use-theme.js';

import { Command } from '@/components/ui/command.js';
import { AssistantChat } from '@/features/assistant/components/AssistantChat/AssistantChat.js';
import type { ThreadMessage } from '@/features/assistant/assistant-thread.js';

type AssistantMode = 'palette' | 'chat';

type AssistantDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTransaction: () => void;
};

export function AssistantDialog({ open, onOpenChange, onAddTransaction }: AssistantDialogProps) {
  const navigate = useNavigate({ from: '/' });
  const { setTheme } = useTheme();
  const [mode, setMode] = React.useState<AssistantMode>('palette');
  const [thread, setThread] = React.useState<ThreadMessage[]>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [hasNavigated, setHasNavigated] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setMode('palette');
      setThread([]);
      setInputValue('');
    }
  }, [open]);

  function returnToPalette() {
    setMode('palette');
    setInputValue('');
  }

  function run(action: () => void) {
    action();
    onOpenChange(false);
  }

  function navigateTo(to: string) {
    run(() => navigate({ to }));
  }

  function changeTheme(value: Theme) {
    run(() => setTheme(value));
  }

  function startChat(text: string) {
    setMode('chat');
    setThread((prev) => [...prev, { role: 'user', text }]);
    setInputValue('');
  }

  function handleOpenChange(value: boolean, eventDetails: DialogRoot.ChangeEventDetails) {
    if (!value && mode === 'chat' && eventDetails.reason === 'escape-key') {
      eventDetails.cancel();
      returnToPalette();
      return;
    }

    if (!value) {
      setMode('palette');
      setThread([]);
      setInputValue('');
    }
    onOpenChange(value);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      setHasNavigated(true);
      return;
    }

    if (event.key !== 'Enter') return;

    const text = inputValue.trim();
    if (!text) return;

    if (hasNavigated) {
      setHasNavigated(false);
      return;
    }

    event.preventDefault();
    startChat(text);
  }

  function handleInputChange(value: string) {
    setHasNavigated(false);
    setInputValue(value);
  }

  function handleChatSubmit(text: string) {
    setThread((prev) => [...prev, { role: 'user', text }]);
  }

  return (
    <Command.Dialog open={open} onOpenChange={handleOpenChange}>
      <Command.Input
        value={inputValue}
        placeholder={mode === 'chat' ? 'Reply…' : 'add, ask, check, do…'}
        onKeyDown={handleInputKeyDown}
        onValueChange={handleInputChange}
      />
      {mode === 'chat' ? (
        <AssistantChat
          messages={thread}
          onSubmit={handleChatSubmit}
          pending={false}
          onBack={returnToPalette}
        />
      ) : (
        <Command.List>
          <Command.Empty>No commands found.</Command.Empty>
          <Command.Group heading="Suggestions">
            <Command.Item onSelect={() => run(onAddTransaction)}>
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
            <Command.Item onSelect={() => navigateTo('/categories')}>
              <Tags />
              Categories
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
          <Command.Separator />
          <Command.Group heading="Theme">
            <Command.Item onSelect={() => changeTheme('light')}>
              <Sun className="mr-2 size-4" />
              Light
            </Command.Item>
            <Command.Item onSelect={() => changeTheme('dark')}>
              <Moon className="mr-2 size-4" />
              Dark
            </Command.Item>
            <Command.Item onSelect={() => changeTheme('system')}>
              <Monitor className="mr-2 size-4" />
              System
            </Command.Item>
          </Command.Group>
        </Command.List>
      )}
    </Command.Dialog>
  );
}
