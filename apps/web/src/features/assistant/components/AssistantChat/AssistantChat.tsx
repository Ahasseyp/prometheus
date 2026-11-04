import * as React from 'react';

import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import type { ThreadMessage } from '@/features/assistant/assistant-thread.js';

export interface AssistantChatProps {
  messages: ThreadMessage[];
  onSubmit(text: string): void;
  pending: boolean;
  onBack?(): void;
}

function CommandCard({ command }: { command: ThreadMessage & { role: 'assistant' } }) {
  const { content } = command;

  if (content.kind === 'text') {
    return (
      <div className="rounded-lg bg-muted p-3 text-sm">
        <p className="text-muted-foreground">{content.text}</p>
      </div>
    );
  }

  if (content.kind === 'needs-clarification') {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-base">Need a bit more detail</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-2 text-sm">
          <p>{content.understood}</p>
          <p>{content.question}</p>
          {content.options !== undefined && content.options.length > 0 && (
            <ul className="list-inside list-disc text-muted-foreground">
              {content.options.map((option) => (
                <li key={option.field}>
                  {option.field}: {option.values.join(', ')}
                </li>
              ))}
            </ul>
          )}
        </Card.Content>
      </Card>
    );
  }

  if (content.kind === 'unsupported') {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-base">Unsupported</Card.Title>
        </Card.Header>
        <Card.Content className="text-sm">
          <p>{content.reason}</p>
        </Card.Content>
      </Card>
    );
  }

  const isTransfer = content.kind === 'add-transfer';
  const action = isTransfer ? 'Transfer' : content.type === 'income' ? 'Income' : 'Expense';

  return (
    <Card data-testid="assistant-command-card">
      <Card.Header>
        <Card.Title className="text-base">{action}</Card.Title>
      </Card.Header>
      <Card.Content className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Amount:</span> {content.amount} {content.currency}
        </p>
        {'accountName' in content && content.accountName !== undefined && (
          <p>
            <span className="text-muted-foreground">Account:</span> {content.accountName}
          </p>
        )}
        {'categoryName' in content && content.categoryName !== undefined && (
          <p>
            <span className="text-muted-foreground">Category:</span> {content.categoryName}
          </p>
        )}
        {'fromAccountName' in content && content.fromAccountName !== undefined && (
          <p>
            <span className="text-muted-foreground">From:</span> {content.fromAccountName}
          </p>
        )}
        {'toAccountName' in content && content.toAccountName !== undefined && (
          <p>
            <span className="text-muted-foreground">To:</span> {content.toAccountName}
          </p>
        )}
        {'description' in content && content.description !== undefined && (
          <p>
            <span className="text-muted-foreground">Description:</span> {content.description}
          </p>
        )}
      </Card.Content>
      <Card.Footer>
        <Button disabled variant="secondary" size="sm">
          Confirm (coming in next slice)
        </Button>
      </Card.Footer>
    </Card>
  );
}

export function AssistantChat({ messages, onSubmit, pending, onBack }: AssistantChatProps) {
  const [text, setText] = React.useState('');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    onSubmit(trimmed);
    setText('');
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && text === '') {
      event.preventDefault();
      onBack?.();
    }
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
        {messages.map((message, index) =>
          message.role === 'user' ? (
            <div
              key={index}
              className="self-end rounded-lg bg-primary px-3 py-2 text-primary-foreground text-sm"
            >
              {message.text}
            </div>
          ) : (
            <CommandCard key={index} command={message} />
          )
        )}
      </div>
      <form onSubmit={handleSubmit} className="mt-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Reply or press Backspace when empty to return"
          className="w-full rounded-md border border-input px-3 py-2 text-sm"
          data-testid="assistant-chat-input"
          disabled={pending}
        />
      </form>
    </div>
  );
}
