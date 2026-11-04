import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

import { Sheet } from '@/components/ui/sheet.js';
import { AssistantChat } from '@/features/assistant/components/AssistantChat/AssistantChat.js';
import {
  toConversationHistory,
  type ThreadMessage,
} from '@/features/assistant/assistant-thread.js';
import {
  useExecuteAssistantCommand,
  useSubmitAssistantCommand,
} from '@/features/assistant/gateways/assistant.js';
import type { Transaction } from '@/features/transactions/gateways/transactions.js';
import { invalidateTransactionData } from '@/features/transactions/gateways/transactions.js';
import { getTransactionMutationErrorMessage } from '@/features/transactions/lib/transaction-errors.js';
import type { EditInFormTarget } from '@/features/assistant/assistant-thread.js';
import type { Transfer } from '@/features/transfers/gateways/transfers.js';

type AssistantSeed = { id: number; text: string };

type AssistantSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Free-form text that opened the sheet; submitted when the sheet opens. */
  seed: AssistantSeed | null;
  /** No-AI escape hatch: open the transaction form pre-filled from a card. */
  onEditInForm: (target: EditInFormTarget) => void;
};

export function AssistantSheet({ open, onOpenChange, seed, onEditInForm }: AssistantSheetProps) {
  const submitCommand = useSubmitAssistantCommand();
  const executeCommand = useExecuteAssistantCommand();
  const queryClient = useQueryClient();
  const [thread, setThread] = React.useState<ThreadMessage[]>([]);
  const [confirmingIndex, setConfirmingIndex] = React.useState<number | null>(null);
  const handledSeedId = React.useRef<number | null>(null);
  // Focus target when the sheet opens: the chat composer, not the scroller.
  const composerRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!open || !seed || handledSeedId.current === seed.id) return;
    handledSeedId.current = seed.id;
    setThread([]);
    handleChatSubmit(seed.text, []);
  }, [open, seed]);

  function handleOpenChange(value: boolean) {
    if (!value) {
      setThread([]);
      setConfirmingIndex(null);
      handledSeedId.current = null;
    }
    onOpenChange(value);
  }

  function handleChatSubmit(text: string, historySource = thread) {
    const history = toConversationHistory(historySource);
    setThread((prev) => [...prev, { role: 'user', text }]);
    submitCommand.mutate(
      { text, history },
      {
        onSuccess: (data) => {
          setThread((prev) => [...prev, { role: 'assistant', content: data }]);
        },
      }
    );
  }

  function handleConfirm(index: number) {
    const message = thread[index];
    if (message?.role !== 'assistant') return;
    const content = message.content;
    if (content.kind !== 'add-transaction' && content.kind !== 'add-transfer') return;
    const executable =
      content.kind === 'add-transaction'
        ? content.accountId !== undefined && content.categoryId !== undefined
        : content.fromAccountId !== undefined && content.toAccountId !== undefined;
    if (!executable) return;

    // The backend converts the parsed currency into the account's currency
    // (via the exchange-rate seam) before creating the entry.
    if (content.kind === 'add-transaction') {
      executeAndRecord(index, (handlers) =>
        executeCommand.mutate(
          {
            kind: 'add-transaction',
            type: content.type,
            amount: content.amount,
            currency: content.currency,
            accountId: content.accountId!,
            categoryId: content.categoryId!,
            date: new Date(content.date),
            description: content.description,
          },
          handlers
        )
      );
      return;
    }

    executeAndRecord(index, (handlers) =>
      executeCommand.mutate(
        {
          kind: 'add-transfer',
          amount: content.amount,
          currency: content.currency,
          fromAccountId: content.fromAccountId!,
          toAccountId: content.toAccountId!,
          date: new Date(content.date),
          description: content.description,
        },
        handlers
      )
    );
  }

  // Runs the execution mutation and records the outcome in the thread: the
  // card flips to a "created" state on success; failures append an assistant
  // message. React Query data is invalidated so balances/lists refresh.
  function executeAndRecord(
    index: number,
    execute: (handlers: {
      onSuccess(created: Transaction | Transfer): void;
      onError(error: Error): void;
    }) => void
  ) {
    setConfirmingIndex(index);
    execute({
      onSuccess: (created) => {
        setConfirmingIndex(null);
        void invalidateTransactionData(queryClient);
        setThread((prev) =>
          prev.map((m, i) =>
            i === index ? { role: 'assistant', content: { kind: 'created', created } } : m
          )
        );
      },
      onError: (error) => {
        setConfirmingIndex(null);
        setThread((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: { kind: 'text', text: getTransactionMutationErrorMessage(error) },
          },
        ]);
      },
    });
  }

  function handleCancel(index: number) {
    setThread((prev) =>
      prev.map((m, i) =>
        i === index ? { role: 'assistant', content: { kind: 'text', text: 'Cancelled.' } } : m
      )
    );
  }

  function handleEditInForm(index: number) {
    const message = thread[index];
    if (message?.role !== 'assistant') return;
    const content = message.content;
    if (content.kind === 'add-transaction') {
      if (content.accountId === undefined || content.categoryId === undefined) return;
      onEditInForm({
        form: 'transaction',
        values: {
          type: content.type,
          amount: content.amount,
          accountId: content.accountId,
          categoryId: content.categoryId,
          // content.date crosses tRPC as a UTC ISO string; format in local
          // time so the form shows the date the user actually means.
          date: format(new Date(content.date), 'yyyy-MM-dd'),
          description: content.description ?? '',
        },
      });
      return;
    }
    if (content.kind === 'add-transfer') {
      if (content.fromAccountId === undefined || content.toAccountId === undefined) return;
      onEditInForm({
        form: 'transfer',
        values: {
          sourceAccountId: content.fromAccountId,
          destinationAccountId: content.toAccountId,
          amount: content.amount,
          date: format(new Date(content.date), 'yyyy-MM-dd'),
          description: content.description ?? '',
        },
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <Sheet.Content side="right" className="sm:max-w-md" initialFocus={composerRef}>
        <Sheet.Header>
          <Sheet.Title>Assistant</Sheet.Title>
          <Sheet.Description className="sr-only">
            Add entries and transfers in plain words.
          </Sheet.Description>
        </Sheet.Header>
        <AssistantChat
          messages={thread}
          onSubmit={(text) => handleChatSubmit(text)}
          pending={submitCommand.isPending}
          confirmingIndex={confirmingIndex}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          onEditInForm={handleEditInForm}
          inputRef={composerRef}
        />
      </Sheet.Content>
    </Sheet>
  );
}
