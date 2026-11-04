import type { ConversationMessage, ResolvedCommand } from './gateways/assistant.js';

export type UserThreadMessage = {
  role: 'user';
  text: string;
};

export type AssistantThreadMessage = {
  role: 'assistant';
  content: ResolvedCommand | { kind: 'text'; text: string };
};

export type ThreadMessage = UserThreadMessage | AssistantThreadMessage;

function summarizeCommand(content: ResolvedCommand): string {
  switch (content.kind) {
    case 'add-transaction':
      return (
        `Parsed a ${content.type} of ${content.amount} ${content.currency}` +
        (content.accountName ? ` on account ${content.accountName}` : '') +
        (content.categoryName ? ` under category ${content.categoryName}` : '') +
        '.'
      );
    case 'add-transfer':
      return (
        `Parsed a transfer of ${content.amount} ${content.currency}` +
        (content.fromAccountName ? ` from ${content.fromAccountName}` : '') +
        (content.toAccountName ? ` to ${content.toAccountName}` : '') +
        '.'
      );
    case 'needs-clarification':
      return content.question;
    case 'unsupported':
      return content.reason;
  }
}

/**
 * Serialize the thread into plain text turns so the backend can treat the
 * conversation as one continuing command (clarification replies complete the
 * original request).
 */
export function toConversationHistory(messages: ThreadMessage[]): ConversationMessage[] {
  return messages.map((message) =>
    message.role === 'user'
      ? { role: 'user', text: message.text }
      : {
          role: 'assistant',
          text:
            message.content.kind === 'text'
              ? message.content.text
              : summarizeCommand(message.content),
        }
  );
}
