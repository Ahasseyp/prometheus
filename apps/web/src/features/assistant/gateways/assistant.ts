import { useMutation } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type ResolvedCommand = inferRouterOutputs<AppRouter>['assistant']['submitCommand'];
export type ExecutableCommand = inferRouterInputs<AppRouter>['assistant']['executeCommand'];
export type ExecutedCommand = inferRouterOutputs<AppRouter>['assistant']['executeCommand'];
export type ConversationMessage = { role: 'user' | 'assistant'; text: string };
export type SubmitCommandInput = { text: string; history?: ConversationMessage[] };

export function useSubmitAssistantCommand() {
  return useMutation({
    mutationFn: (input: SubmitCommandInput) => trpc.assistant.submitCommand.mutate(input),
  });
}

export function useExecuteAssistantCommand() {
  return useMutation({
    mutationFn: (input: ExecutableCommand) => trpc.assistant.executeCommand.mutate(input),
  });
}
