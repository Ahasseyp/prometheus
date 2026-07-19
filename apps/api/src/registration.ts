import { z } from 'zod';

import { passwordSchema } from '@prometheus/domain';

import { publicUserSchema } from './lib/user.js';
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
    .mutation(async ({ input }) => {
      if (!isRegistrationEnabled()) {
        return { ok: false as const, error: 'registration-disabled' as const };
      }

      const result = await registerUser(input);

      if (!result.ok) {
        return { ok: false as const, error: result.error };
      }

      return { ok: true as const, user: result.user };
    }),
});

export type RegistrationRouter = typeof registrationRouter;
