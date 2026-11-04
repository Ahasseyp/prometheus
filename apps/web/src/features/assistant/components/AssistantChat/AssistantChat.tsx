import * as React from 'react';
import { ArrowUpIcon, CheckIcon, SparklesIcon } from 'lucide-react';

import { Bubble } from '@/components/ui/bubble.js';
import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { Empty } from '@/components/ui/empty.js';
import { InputGroup } from '@/components/ui/input-group.js';
import { Item } from '@/components/ui/item.js';
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
  confirmingIndex: number | null;
  onConfirm(index: number): void;
  onCancel(index: number): void;
  onEditInForm(index: number): void;
  /** Ref to the composer, so the host (Sheet) can focus it on open. */
  inputRef?: React.Ref<HTMLTextAreaElement>;
}

function AssistantTurn({
  message,
  index,
  confirmingIndex,
  onConfirm,
  onCancel,
  onEditInForm,
}: {
  message: ThreadMessage;
  index: number;
  confirmingIndex: number | null;
  onConfirm(index: number): void;
  onCancel(index: number): void;
  onEditInForm(index: number): void;
}) {
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
          <CommandCard
            content={message.content}
            index={index}
            confirming={confirmingIndex === index}
            onConfirm={onConfirm}
            onCancel={onCancel}
            onEditInForm={onEditInForm}
          />
        </Message.Content>
      </Message>
    </MessageScroller.Item>
  );
}

function CommandCard({
  content,
  index,
  confirming,
  onConfirm,
  onCancel,
  onEditInForm,
}: {
  content: AssistantThreadMessage['content'];
  index: number;
  confirming: boolean;
  onConfirm(index: number): void;
  onCancel(index: number): void;
  onEditInForm(index: number): void;
}) {
  if (content.kind === 'text') {
    return <p className="text-sm text-muted-foreground">{content.text}</p>;
  }

  if (content.kind === 'created') {
    const created = content.created;
    const tx = 'sourceTransaction' in created ? created.sourceTransaction : created;
    return (
      <Card data-testid="assistant-created-card">
        <Card.Header>
          <Card.Title className="flex items-center gap-2 text-base">
            <CheckIcon className="text-emerald-500" />
            Created
          </Card.Title>
        </Card.Header>
        <Card.Content className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Amount:</span> {tx.amount} {tx.accountCurrency}
          </p>
          <p>
            <span className="text-muted-foreground">Account:</span> {tx.accountName}
          </p>
          {tx.categoryName && (
            <p>
              <span className="text-muted-foreground">Category:</span> {tx.categoryName}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Date:</span>{' '}
            {new Date(tx.date).toLocaleDateString()}
          </p>
        </Card.Content>
      </Card>
    );
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
  const executable = isTransfer
    ? content.fromAccountId !== undefined && content.toAccountId !== undefined
    : content.accountId !== undefined && content.categoryId !== undefined;

  return (
    <>
      <Card data-testid="assistant-command-card">
        <Card.Header>
          <Card.Title className="text-base">{action}</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Amount:</span> {content.amount}{' '}
            {content.currency}
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
      </Card>
      {/* AI Elements "Confirmation" pattern: the parsed details live in the
          Card; the approval prompt sits below it as an Item. */}
      {executable ? (
        <Item variant="outline" size="sm">
          <Item.Media variant="icon">
            <SparklesIcon />
          </Item.Media>
          <Item.Content>
            <Item.Title>Add this {action.toLowerCase()}?</Item.Title>
            <Item.Description>
              {content.amount} {content.currency}
              {'accountName' in content && content.accountName !== undefined
                ? ` · ${content.accountName}`
                : ''}
              {'categoryName' in content && content.categoryName !== undefined
                ? ` · ${content.categoryName}`
                : ''}
            </Item.Description>
          </Item.Content>
          <Item.Actions>
            {!isTransfer && (
              <Button variant="ghost" size="sm" onClick={() => onEditInForm(index)}>
                Edit in form
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onCancel(index)}>
              Deny
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => onConfirm(index)}
              disabled={confirming}
              data-testid="assistant-confirm-button"
            >
              {confirming && <Spinner data-icon="inline-start" />}
              Approve
            </Button>
          </Item.Actions>
        </Item>
      ) : (
        <Item variant="muted" size="sm">
          <Item.Content>
            <Item.Description>Cannot confirm — missing account or category.</Item.Description>
          </Item.Content>
        </Item>
      )}
    </>
  );
}

export function AssistantChat({
  messages,
  onSubmit,
  pending,
  confirmingIndex,
  onConfirm,
  onCancel,
  onEditInForm,
  inputRef,
}: AssistantChatProps) {
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
                    <AssistantTurn
                      key={index}
                      message={message}
                      index={index}
                      confirmingIndex={confirmingIndex}
                      onConfirm={onConfirm}
                      onCancel={onCancel}
                      onEditInForm={onEditInForm}
                    />
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
                ref={inputRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Reply…"
                aria-label="Message the assistant"
                data-testid="assistant-chat-input"
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
