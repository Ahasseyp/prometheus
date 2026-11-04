import * as React from 'react';
import { format } from 'date-fns';

import { Sheet } from '@/components/ui/sheet.js';
import { AssistantChat } from '@/features/assistant/components/AssistantChat/AssistantChat.js';
import {
  toConversationHistory,
  type ThreadMessage,
} from '@/features/assistant/assistant-thread.js';
import { useSubmitAssistantCommand } from '@/features/assistant/gateways/assistant.js';
import { useCreateTransaction } from '@/features/transactions/gateways/transactions.js';
import { getTransactionMutationErrorMessage } from '@/features/transactions/lib/transaction-errors.js';
import type { TransactionFormDefaults } from '@/features/transactions/components/TransactionForm/TransactionForm.js';
import { useCreateTransfer } from '@/features/transfers/gateways/transfers.js';

type AssistantSeed = { id: number; text: string };

type AssistantSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Free-form text that opened the sheet; submitted when the sheet opens. */
  seed: AssistantSeed | null;
  /** No-AI escape hatch: open the transaction form pre-filled from a card. */
  onEditInForm: (values: TransactionFormDefaults) => void;
};

export function AssistantSheet({ open, onOpenChange, seed, onEditInForm }: AssistantSheetProps) {
  const submitCommand = useSubmitAssistantCommand();
  const createTransaction = useCreateTransaction();
  const createTransfer = useCreateTransfer();
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
    setConfirmingIndex(index);

    if (content.kind === 'add-transaction') {
      createTransaction.mutate(
        {
          type: content.type,
          amount: content.amount,
          accountId: content.accountId!,
          categoryId: content.categoryId!,
          date: new Date(content.date),
          description: content.description ?? '',
        },
        {
          onSuccess: (transaction) => {
            setConfirmingIndex(null);
            setThread((prev) =>
              prev.map((m, i) =>
                i === index
                  ? { role: 'assistant', content: { kind: 'created', created: transaction } }
                  : m
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
        }
      );
      return;
    }

    if (content.fromAccountId === undefined || content.toAccountId === undefined) return;
    createTransfer.mutate(
      {
        sourceAccountId: content.fromAccountId,
        destinationAccountId: content.toAccountId,
        amount: content.amount,
        date: new Date(content.date),
        description: content.description ?? '',
      },
      {
        onSuccess: (transfer) => {
          setConfirmingIndex(null);
          setThread((prev) =>
            prev.map((m, i) =>
              i === index
                ? { role: 'assistant', content: { kind: 'created', created: transfer } }
                : m
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
      }
    );
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
    if (content.kind !== 'add-transaction') return;
    if (content.accountId === undefined || content.categoryId === undefined) return;
    onEditInForm({
      type: content.type,
      amount: content.amount,
      accountId: content.accountId,
      categoryId: content.categoryId,
      // content.date crosses tRPC as a UTC ISO string; format in local time so
      // the form shows the date the user actually means (today by default).
      date: format(new Date(content.date), 'yyyy-MM-dd'),
      description: content.description ?? '',
    });
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
