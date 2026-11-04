import { z } from 'zod';

import { getHouseholdId, protectedProcedure, router } from './trpc.js';
import { resolvedCommandSchema } from './assistant/add-command.js';
import { submitCommand } from './assistant/service.js';

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
});
