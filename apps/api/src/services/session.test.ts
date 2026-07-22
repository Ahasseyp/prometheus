import { describe, it, expect, afterAll } from 'vitest';
import argon2 from 'argon2';
import crypto from 'node:crypto';

import { getPrisma } from '../prisma.js';
import { findUserBySessionToken } from './session.js';
import { cleanupTestData, makeTestEmail } from '../test/server.js';

describe('session service', () => {
  const createdUserIds: string[] = [];
  const createdHouseholdIds: string[] = [];

  afterAll(async () => {
    await cleanupTestData({ userIds: createdUserIds, householdIds: createdHouseholdIds });
  });

  async function createUser(email: string, password: string) {
    const prisma = getPrisma();
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  async function createSession(userId: string) {
    const prisma = getPrisma();
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
    return token;
  }

  it('resolves an authenticated user without a household when no membership exists', async () => {
    const email = makeTestEmail('session-no-household');
    const user = await createUser(email, 'Secure-password-1');
    const token = await createSession(user.id);

    const authenticatedUser = await findUserBySessionToken(token);

    expect(authenticatedUser).not.toBeNull();
    expect(authenticatedUser?.id).toBe(user.id);
    expect(authenticatedUser?.household).toBeNull();
  });

  it('resolves the active household context for an authenticated user', async () => {
    const email = makeTestEmail('session-with-household');
    const user = await createUser(email, 'Secure-password-2');

    const household = await getPrisma().household.create({
      data: {
        name: 'Test Household',
        reportingCurrency: 'MXN',
        memberships: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    });
    createdHouseholdIds.push(household.id);

    const token = await createSession(user.id);
    const authenticatedUser = await findUserBySessionToken(token);

    expect(authenticatedUser).not.toBeNull();
    expect(authenticatedUser?.household).toEqual({
      id: household.id,
      name: household.name,
      reportingCurrency: household.reportingCurrency,
      role: 'OWNER',
    });
  });
});
