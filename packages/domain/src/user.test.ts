import { describe, expect, it } from 'vitest';
import { makeUserId } from './ids.js';
import { createUser } from './user.js';
import { expectError, expectValue } from './testing/expect-value.js';

describe('createUser', () => {
  it('creates a user with a valid email', () => {
    const user = expectValue(
      createUser({
        id: makeUserId('user-1'),
        email: 'alice@example.com',
        name: 'Alice',
      })
    );

    expect(user.email).toBe('alice@example.com');
    expect(user.name).toBe('Alice');
  });

  it('normalizes email to lowercase', () => {
    const user = expectValue(
      createUser({
        id: makeUserId('user-1'),
        email: 'Alice@Example.com',
      })
    );

    expect(user.email).toBe('alice@example.com');
  });

  it('rejects an invalid email', () => {
    const error = expectError(createUser({ id: makeUserId('user-1'), email: 'not-an-email' }));

    expect(error.type).toBe('invalid-email');
  });
});
