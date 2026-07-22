import type { UserId } from './ids.js';
import type { Result } from './types.js';
import { createTimestamps } from './timestamps.js';

/**
 * A person who authenticates into the app and belongs to a Household.
 */
export type User = {
  readonly id: UserId;
  readonly email: string;
  readonly name: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type UserError = { type: 'invalid-email'; email: string };

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates a User value object, validating the email format.
 */
export function createUser(params: {
  id: UserId;
  email: string;
  name?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): Result<User, UserError> {
  const normalizedEmail = params.email.toLowerCase().trim();
  if (!emailRegex.test(normalizedEmail)) {
    return { ok: false, error: { type: 'invalid-email', email: params.email } };
  }

  return {
    ok: true,
    value: {
      id: params.id,
      email: normalizedEmail,
      name: params.name ?? null,
      ...createTimestamps({ createdAt: params.createdAt, updatedAt: params.updatedAt }),
    },
  };
}
