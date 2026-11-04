import * as React from 'react';

import type { ThreadMessage } from '@/features/assistant/assistant-thread.js';

export interface AssistantChatProps {
  messages: ThreadMessage[];
  onSubmit(text: string): void;
  pending: boolean;
  onBack?(): void;
}

export function AssistantChat({ messages, onSubmit, pending, onBack }: AssistantChatProps) {
  const [text, setText] = React.useState('');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
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
      <div
        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center"
        data-testid="assistant-chat-stub"
      >
        <p className="text-sm font-medium text-muted-foreground">AssistantChat (stub)</p>
        <pre className="mt-2 max-w-full overflow-auto text-xs text-muted-foreground">
          {JSON.stringify({ messages, pending }, null, 2)}
        </pre>
      </div>
      <form onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Reply or press Backspace when empty to return"
          className="w-full rounded-md border border-input px-3 py-2 text-sm"
          data-testid="assistant-chat-input"
        />
      </form>
    </div>
  );
}
