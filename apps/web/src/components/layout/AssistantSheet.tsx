import * as React from 'react';

import { Sheet } from '@/components/ui/sheet.js';
import { AssistantChat } from '@/features/assistant/components/AssistantChat/AssistantChat.js';
import {
  toConversationHistory,
  type ThreadMessage,
} from '@/features/assistant/assistant-thread.js';
import { useSubmitAssistantCommand } from '@/features/assistant/gateways/assistant.js';

type AssistantSeed = { id: number; text: string };

type AssistantSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Free-form text that opened the sheet; submitted when the sheet opens. */
  seed: AssistantSeed | null;
};

export function AssistantSheet({ open, onOpenChange, seed }: AssistantSheetProps) {
  const submitCommand = useSubmitAssistantCommand();
  const [thread, setThread] = React.useState<ThreadMessage[]>([]);
  const handledSeedId = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!open || !seed || handledSeedId.current === seed.id) return;
    handledSeedId.current = seed.id;
    setThread([]);
    handleChatSubmit(seed.text, []);
  }, [open, seed]);

  function handleOpenChange(value: boolean) {
    if (!value) {
      setThread([]);
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

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <Sheet.Content side="right" className="sm:max-w-md">
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
        />
      </Sheet.Content>
    </Sheet>
  );
}
