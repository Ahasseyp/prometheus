import { z } from 'zod';
import argon2 from 'argon2';
import { getPrisma } from './prisma.js';
import { publicProcedure, router } from './trpc.js';

const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerOutputSchema = z.union([
  z.object({
    ok: z.literal(true),
    user: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string().nullable(),
      createdAt: z.preprocess(
        (value) => (value instanceof Date ? value.toISOString() : value),
        z.string().datetime()
      ),
      updatedAt: z.preprocess(
        (value) => (value instanceof Date ? value.toISOString() : value),
        z.string().datetime()
      ),
    }),
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

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export const registrationRouter = router({
  register: publicProcedure
    .input(registerInputSchema)
    .output(registerOutputSchema)
    .mutation(async ({ input }) => {
      if (!isRegistrationEnabled()) {
        return { ok: false as const, error: 'registration-disabled' as const };
      }

      const email = normalizeEmail(input.email);
      const prisma = getPrisma();

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser !== null) {
        return { ok: false as const, error: 'email-already-exists' as const };
      }

      const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return { ok: true as const, user };
    }),
});

export type RegistrationRouter = typeof registrationRouter;
