import crypto from 'node:crypto';

import argon2 from 'argon2';

import { getPrisma } from '../prisma.js';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type LoginSuccess = {
  ok: true;
  user: AuthenticatedUser;
  token: string;
};

type LoginFailure = {
  ok: false;
  error: 'invalid-credentials';
};

export type LoginResult = LoginSuccess | LoginFailure;

export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const email = input.email.toLowerCase().trim();
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user === null) {
    return { ok: false, error: 'invalid-credentials' };
  }

  const isValidPassword = await argon2.verify(user.passwordHash, input.password);

  if (!isValidPassword) {
    return { ok: false, error: 'invalid-credentials' };
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token,
  };
}

export async function logoutUser(token: string): Promise<void> {
  const prisma = getPrisma();

  await prisma.session.deleteMany({
    where: { token },
  });
}

export async function findUserBySessionToken(token: string): Promise<AuthenticatedUser | null> {
  const prisma = getPrisma();

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (session === null || session.expiresAt <= new Date()) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    createdAt: session.user.createdAt,
    updatedAt: session.user.updatedAt,
  };
}
