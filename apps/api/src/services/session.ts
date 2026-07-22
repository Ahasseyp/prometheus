import crypto from 'node:crypto';

import argon2 from 'argon2';

import { getPrisma } from '../prisma.js';
import {
  mapMembershipToHouseholdContext,
  type HouseholdContext,
  type MembershipWithHousehold,
} from './household.js';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type LoginInput = {
  email: string;
  password: string;
};

type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthenticatedUser = User & {
  household: HouseholdContext | null;
};

type LoginSuccess = {
  ok: true;
  user: User;
  token: string;
};

type LoginFailure = {
  ok: false;
  error: 'invalid-credentials';
};

export type LoginResult = LoginSuccess | LoginFailure;

function mapUserToAuthenticatedUser(
  user: User,
  memberships: MembershipWithHousehold[]
): AuthenticatedUser {
  // v1 restricts a user to a single household (see #49), so the first
  // membership is the active one.
  const activeMembership = memberships[0] ?? null;

  return {
    ...user,
    household: activeMembership === null ? null : mapMembershipToHouseholdContext(activeMembership),
  };
}

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
    include: {
      user: {
        include: {
          memberships: {
            orderBy: { createdAt: 'asc' },
            include: { household: true },
          },
        },
      },
    },
  });

  if (session === null || session.expiresAt <= new Date()) {
    return null;
  }

  return mapUserToAuthenticatedUser(session.user, session.user.memberships);
}
