import { serialize } from 'cookie';
import { z } from 'zod';

import { publicUserSchema } from './lib/user.js';
import { loginUser, logoutUser } from './services/session.js';
import { protectedProcedure, publicProcedure, router } from './trpc.js';

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Enter a password.'),
});

const allowInsecureCookiesSchema = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

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

function isInsecureCookiesAllowed(): boolean {
  return allowInsecureCookiesSchema.parse(process.env.ALLOW_INSECURE_COOKIES);
}

function createSessionCookieValue(token: string, maxAge: number): string {
  return serialize(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: !isInsecureCookiesAllowed(),
    maxAge,
    path: '/',
  });
}

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
