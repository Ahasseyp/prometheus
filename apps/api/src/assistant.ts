import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { getHouseholdId, protectedProcedure, router } from './trpc.js';
import { executableCommandSchema, resolvedCommandSchema } from './assistant/add-command.js';
import { executeCommand } from './assistant/execute-command.js';
import { submitCommand } from './assistant/service.js';
import { transactionResponseSchema } from './transaction.js';
import { transferResponseSchema } from './transfer.js';

const submitCommandInputSchema = z.object({
  text: z.string().min(1, 'Enter a command.'),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string() })).optional(),
});

export const assistantRouter = router({
  submitCommand: protectedProcedure
    .input(submitCommandInputSchema)
    .output(resolvedCommandSchema)
    .mutation(async ({ ctx, input }) => {
      const householdId = getHouseholdId(ctx, 'assistant commands');
      return submitCommand(householdId, input.text, input.history ?? []);
    }),

  executeCommand: protectedProcedure
    .input(executableCommandSchema)
    .output(z.union([transactionResponseSchema, transferResponseSchema]))
    .mutation(async ({ ctx, input }) => {
      const householdId = getHouseholdId(ctx, 'assistant commands');
      const result = await executeCommand(householdId, input);
      if (!result.ok) {
        // Surfaced in the chat as an assistant message, not a toast.
        throw new TRPCError({ code: 'BAD_REQUEST', message: result.error });
      }
      return result.created as
        z.infer<typeof transactionResponseSchema> | z.infer<typeof transferResponseSchema>;
    }),
});
