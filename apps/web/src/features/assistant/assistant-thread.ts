export type ThreadMessage =
  | {
      role: 'user';
      text: string;
    }
  | {
      role: 'assistant';
      placeholder: string;
    };
