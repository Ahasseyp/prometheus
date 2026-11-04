import type { Transaction } from '@/features/transactions/gateways/transactions.js';
import type { Transfer } from '@/features/transfers/gateways/transfers.js';

import type { ConversationMessage, ResolvedCommand } from './gateways/assistant.js';

export type UserThreadMessage = {
  role: 'user';
  text: string;
};

export type CreatedThreadContent = {
  kind: 'created';
  created: Transaction | Transfer;
};

export type AssistantThreadMessage = {
  role: 'assistant';
  content: ResolvedCommand | CreatedThreadContent | { kind: 'text'; text: string };
};

export type ThreadMessage = UserThreadMessage | AssistantThreadMessage;

function summarizeCommand(content: ResolvedCommand | CreatedThreadContent): string {
  if (content.kind === 'created') {
    const tx =
      'sourceTransaction' in content.created ? content.created.sourceTransaction : content.created;
    return (
      `Created a ${tx.type} of ${tx.amount} ${tx.accountCurrency}` +
      (tx.categoryName ? ` under category ${tx.categoryName}` : '') +
      '.'
    );
  }

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
