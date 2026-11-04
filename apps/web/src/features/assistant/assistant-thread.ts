import type { ResolvedCommand } from './gateways/assistant.js';

export type UserThreadMessage = {
  role: 'user';
  text: string;
};

export type AssistantThreadMessage = {
  role: 'assistant';
  content: ResolvedCommand | { kind: 'text'; text: string };
};

export type ThreadMessage = UserThreadMessage | AssistantThreadMessage;
