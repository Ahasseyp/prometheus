import { z } from 'zod';

import { passwordSchema } from '@prometheus/domain';

import { createSessionCookieValue, SESSION_TTL_SECONDS } from './lib/session-cookie.js';
import { publicUserSchema } from './lib/user.js';
import { loginUser } from './services/session.js';
import { registerUser } from './services/registration.js';
import { publicProcedure, router } from './trpc.js';

const registerInputSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
});

const registerOutputSchema = z.union([
  z.object({
    ok: z.literal(true),
    user: publicUserSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.enum(['registration-disabled', 'email-already-exists']),
  }),
]);

const allowRegistrationSchema = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

function isRegistrationEnabled(): boolean {
  return allowRegistrationSchema.parse(process.env.ALLOW_REGISTRATION);
}

export const registrationRouter = router({
  register: publicProcedure
    .input(registerInputSchema)
    .output(registerOutputSchema)
    .mutation(async ({ input, ctx }) => {
      if (!isRegistrationEnabled()) {
        return { ok: false as const, error: 'registration-disabled' as const };
      }

      const result = await registerUser(input);

      if (!result.ok) {
        return { ok: false as const, error: result.error };
      }

      // Log the new user in immediately after a successful registration so they
      // proceed straight to household creation instead of landing back on the
      // login page.
      const loginResult = await loginUser(input);

      if (!loginResult.ok) {
        // A successful registration should always be followed by a valid login.
        // Reaching this branch means the user record was created but the
        // credentials could not be verified, which is an unexpected server error.
        throw new Error(`Auto-login failed after registration: ${loginResult.error}`);
      }

      ctx.res.setHeader(
        'Set-Cookie',
        createSessionCookieValue(loginResult.token, SESSION_TTL_SECONDS)
      );

      return { ok: true as const, user: loginResult.user };
    }),
});

export type RegistrationRouter = typeof registrationRouter;
