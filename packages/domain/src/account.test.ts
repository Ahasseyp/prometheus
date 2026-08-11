import { describe, it, expect } from 'vitest';
import { createAccount, AccountType } from './account.js';
import { makeAccountId, makeHouseholdId } from './ids.js';
import { expectError, expectValue } from './testing/expect-value.js';

describe('createAccount', () => {
  const validParams = {
    id: makeAccountId('00000000-0000-0000-0000-000000000001'),
    householdId: makeHouseholdId('00000000-0000-0000-0000-000000000002'),
    name: 'My Checking',
    type: 'checking',
    currency: 'USD',
  };

  it('creates a valid checking account', () => {
    const account = expectValue(createAccount(validParams));

    expect(account.id).toBe(validParams.id);
    expect(account.householdId).toBe(validParams.householdId);
    expect(account.name).toBe('My Checking');
    expect(account.type).toBe(AccountType.Checking);
    expect(account.currency).toBe('USD');
    expect(account.createdAt).toBeInstanceOf(Date);
    expect(account.updatedAt).toBeInstanceOf(Date);
  });

  it('trims the account name', () => {
    const account = expectValue(createAccount({ ...validParams, name: '  My Checking  ' }));

    expect(account.name).toBe('My Checking');
  });

  it('accepts every supported account type', () => {
    const types = Object.values(AccountType);
    for (const type of types) {
      const account = expectValue(createAccount({ ...validParams, type }));
      expect(account.type).toBe(type);
    }
  });

  it('rejects an empty name', () => {
    const error = expectError(createAccount({ ...validParams, name: '   ' }));

    expect(error).toEqual({ type: 'empty-name' });
  });

  it('rejects an unsupported account type', () => {
    const error = expectError(createAccount({ ...validParams, type: 'mortgage' }));

    expect(error).toEqual({ type: 'invalid-type', typeValue: 'mortgage' });
  });

  it('rejects an unsupported currency', () => {
    const error = expectError(createAccount({ ...validParams, currency: 'XYZ' }));

    expect(error).toEqual({ type: 'invalid-currency', currency: 'XYZ' });
  });
});
