import { z } from 'zod';

import { createSessionCookieValue, SESSION_TTL_SECONDS } from './lib/session-cookie.js';
import { publicUserSchema } from './lib/user.js';
import { loginUser, logoutUser } from './services/session.js';
import { protectedProcedure, publicProcedure, router } from './trpc.js';

const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Enter a password.'),
});

const loginOutputSchema = z.union([
  z.object({
    ok: z.literal(true),
    user: publicUserSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.enum(['invalid-credentials']),
  }),
]);

export const authRouter = router({
  login: publicProcedure
    .input(loginInputSchema)
    .output(loginOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await loginUser(input);

      if (!result.ok) {
        return { ok: false as const, error: result.error };
      }

      ctx.res.setHeader('Set-Cookie', createSessionCookieValue(result.token, SESSION_TTL_SECONDS));

      return {
        ok: true as const,
        user: result.user,
      };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    if (ctx.sessionToken !== null) {
      await logoutUser(ctx.sessionToken);
    }

    ctx.res.setHeader('Set-Cookie', createSessionCookieValue('', 0));

    return { ok: true as const };
  }),

  me: protectedProcedure.output(publicUserSchema).query(({ ctx }) => ctx.user),
});

export type AuthRouter = typeof authRouter;
