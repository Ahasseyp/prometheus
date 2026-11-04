import { useMutation } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type ResolvedCommand = inferRouterOutputs<AppRouter>['assistant']['submitCommand'];
export type SubmitCommandInput = { text: string };

export function useSubmitAssistantCommand() {
  return useMutation({
    mutationFn: (input: SubmitCommandInput) => trpc.assistant.submitCommand.mutate(input),
  });
}
