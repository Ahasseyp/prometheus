import argon2 from 'argon2';

import { getPrisma } from '../prisma.js';

export type RegisterInput = {
  email: string;
  password: string;
};

export type RegisterResult =
  | {
      ok: true;
      user: {
        id: string;
        email: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
      };
    }
  | { ok: false; error: 'email-already-exists' };

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const email = input.email.toLowerCase().trim();
  const prisma = getPrisma();

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser !== null) {
    return { ok: false, error: 'email-already-exists' };
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

  return { ok: true, user };
}
