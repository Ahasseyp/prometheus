import { z } from "zod";
import { publicProcedure, router } from "./trpc.js";

const moneySchema = z.object({
  amount: z.string().regex(/^-?\d+(\.\d{1,4})?$/, "Invalid money format"),
  currency: z.string().length(3, "Currency must be ISO 4217 (3 chars)"),
});

export const createTransactionSchema = z.object({
  description: z.string().min(1).max(255),
  ...moneySchema.shape,
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const appRouter = router({
  transaction: router({
    create: publicProcedure
      .input(createTransactionSchema)
      .mutation(async ({ input, ctx }) => {
        const tx = await ctx.prisma.transaction.create({
          data: {
            description: input.description,
            amount: input.amount,
            currency: input.currency,
          },
        });
        return tx;
      }),
  }),
});

export type AppRouter = typeof appRouter;
