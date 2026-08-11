import { describe, it, expect } from 'vitest';
import { createAccount, AccountType } from './account.js';
import { makeAccountId, makeHouseholdId } from './ids.js';

describe('createAccount', () => {
  const validParams = {
    id: makeAccountId('00000000-0000-0000-0000-000000000001'),
    householdId: makeHouseholdId('00000000-0000-0000-0000-000000000002'),
    name: 'My Checking',
    type: 'checking',
    currency: 'USD',
  };

  it('creates a valid checking account', () => {
    const result = createAccount(validParams);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.id).toBe(validParams.id);
    expect(result.value.householdId).toBe(validParams.householdId);
    expect(result.value.name).toBe('My Checking');
    expect(result.value.type).toBe(AccountType.Checking);
    expect(result.value.currency).toBe('USD');
    expect(result.value.createdAt).toBeInstanceOf(Date);
    expect(result.value.updatedAt).toBeInstanceOf(Date);
  });

  it('trims the account name', () => {
    const result = createAccount({ ...validParams, name: '  My Checking  ' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.name).toBe('My Checking');
  });

  it('accepts every supported account type', () => {
    const types = Object.values(AccountType);
    for (const type of types) {
      const result = createAccount({ ...validParams, type });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe(type);
      }
    }
  });

  it('rejects an empty name', () => {
    const result = createAccount({ ...validParams, name: '   ' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ type: 'empty-name' });
    }
  });

  it('rejects an unsupported account type', () => {
    const result = createAccount({ ...validParams, type: 'mortgage' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ type: 'invalid-type', typeValue: 'mortgage' });
    }
  });

  it('rejects an unsupported currency', () => {
    const result = createAccount({ ...validParams, currency: 'XYZ' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ type: 'invalid-currency', currency: 'XYZ' });
    }
  });
});
