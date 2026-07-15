import { describe, expect, it } from 'vitest';
import { makeUserId } from './ids.js';
import { createUser } from './user.js';

describe('createUser', () => {
  it('creates a user with a valid email', () => {
    const result = createUser({
      id: makeUserId('user-1'),
      email: 'alice@example.com',
      name: 'Alice',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.email).toBe('alice@example.com');
    expect(result.value.name).toBe('Alice');
  });

  it('normalizes email to lowercase', () => {
    const result = createUser({
      id: makeUserId('user-1'),
      email: 'Alice@Example.com',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.email).toBe('alice@example.com');
  });

  it('rejects an invalid email', () => {
    const result = createUser({ id: makeUserId('user-1'), email: 'not-an-email' });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.type).toBe('invalid-email');
  });
});
