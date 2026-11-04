import * as React from 'react';
import { ArrowUpIcon, SparklesIcon } from 'lucide-react';

import { Bubble } from '@/components/ui/bubble.js';
import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { Empty } from '@/components/ui/empty.js';
import { InputGroup } from '@/components/ui/input-group.js';
import { Message } from '@/components/ui/message.js';
import { MessageScroller } from '@/components/ui/message-scroller.js';
import { Spinner } from '@/components/ui/spinner.js';
import type {
  AssistantThreadMessage,
  ThreadMessage,
} from '@/features/assistant/assistant-thread.js';

export interface AssistantChatProps {
  messages: ThreadMessage[];
  onSubmit(text: string): void;
  pending: boolean;
}

function AssistantTurn({ message, index }: { message: ThreadMessage; index: number }) {
  if (message.role === 'user') {
    return (
      <MessageScroller.Item messageId={`user-${index}`} scrollAnchor>
        <Message align="end">
          <Message.Content>
            <Bubble align="end" variant="muted">
              <Bubble.Content>{message.text}</Bubble.Content>
            </Bubble>
          </Message.Content>
        </Message>
      </MessageScroller.Item>
    );
  }

  return (
    <MessageScroller.Item messageId={`assistant-${index}`}>
      <Message>
        <Message.Content>
          <CommandCard content={message.content} />
        </Message.Content>
      </Message>
    </MessageScroller.Item>
  );
}

function CommandCard({ content }: { content: AssistantThreadMessage['content'] }) {
  if (content.kind === 'text') {
    return <p className="text-sm text-muted-foreground">{content.text}</p>;
  }

  if (content.kind === 'needs-clarification') {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-base">Need a bit more detail</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-2 text-sm">
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

export function AssistantChat({ messages, onSubmit, pending }: AssistantChatProps) {
  const [text, setText] = React.useState('');
  const formRef = React.useRef<HTMLFormElement>(null);
  const canSend = text.trim().length > 0 && !pending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;
    onSubmit(text.trim());
    setText('');
  }

  return (
    <MessageScroller.Provider autoScroll>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 px-4">
          {messages.length === 0 ? (
            <Empty className="h-full">
              <Empty.Header>
                <Empty.Media variant="icon">
                  <SparklesIcon />
                </Empty.Media>
                <Empty.Title>Assistant</Empty.Title>
                <Empty.Description>
                  Add transactions or transfers in plain words, and I&apos;ll fill in the details.
                </Empty.Description>
              </Empty.Header>
            </Empty>
          ) : (
            <MessageScroller>
              <MessageScroller.Viewport>
                <MessageScroller.Content aria-busy={pending} className="py-4">
                  {messages.map((message, index) => (
                    <AssistantTurn key={index} message={message} index={index} />
                  ))}
                </MessageScroller.Content>
              </MessageScroller.Viewport>
              <MessageScroller.Button />
            </MessageScroller>
          )}
        </div>
        <div className="p-4 pt-2">
          <form ref={formRef} onSubmit={handleSubmit}>
            <InputGroup>
              <InputGroup.Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Reply…"
                aria-label="Message the assistant"
                data-testid="assistant-chat-input"
                disabled={pending}
                className="min-h-14"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    formRef.current?.requestSubmit();
                  }
                }}
              />
              <InputGroup.Addon align="block-end">
                <InputGroup.Button
                  type="submit"
                  variant="default"
                  size="icon-sm"
                  disabled={!canSend}
                  className="ml-auto"
                  aria-label="Send"
                >
                  {pending ? <Spinner /> : <ArrowUpIcon />}
                </InputGroup.Button>
              </InputGroup.Addon>
            </InputGroup>
          </form>
        </div>
      </div>
    </MessageScroller.Provider>
  );
}
