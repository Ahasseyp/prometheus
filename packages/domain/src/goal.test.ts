import { describe, expect, it } from 'vitest';

import { AccountType } from './account.js';
import { createGoal, createGoalContribution, isContributionFundingType } from './goal.js';
import { makeAccountId, makeGoalContributionId, makeGoalId, makeHouseholdId } from './ids.js';
import { createMoney } from './money.js';

function usd(amount: string) {
  const result = createMoney(amount, 'USD');
  if (!result.ok) throw new Error('expected valid money');
  return result.value;
}

const validContributionParams = {
  id: makeGoalContributionId('b6a99269-1f3b-47c6-9c7a-5eb0a4f7c3d1'),
  goalId: makeGoalId('9b2f2652-2a62-4a26-92aa-c3129b6a622c'),
  accountId: makeAccountId('2bd9b6c4-2a2f-4f84-9c1d-7b8e2a4c6d8e'),
  amount: usd('100.00'),
};

describe('createGoalContribution', () => {
  it('creates a Goal Contribution with a positive amount', () => {
    const result = createGoalContribution(validContributionParams);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(validContributionParams.id);
    expect(result.value.goalId).toBe(validContributionParams.goalId);
    expect(result.value.accountId).toBe(validContributionParams.accountId);
    expect(result.value.amount.toDecimal()).toBe('100.00');
    expect(result.value.amount.currency).toBe('USD');
  });

  it('rejects a non-positive amount', () => {
    for (const amount of [usd('0'), usd('-5')]) {
      const result = createGoalContribution({ ...validContributionParams, amount });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('non-positive-amount');
    }
  });
});

describe('isContributionFundingType', () => {
  it('allows asset accounts that hold money you have', () => {
    for (const type of [
      AccountType.Checking,
      AccountType.Savings,
      AccountType.Cash,
      AccountType.Investment,
    ]) {
      expect(isContributionFundingType(type)).toBe(true);
    }
  });

  it('rejects debt accounts', () => {
    for (const type of [AccountType.CreditCard, AccountType.Loan]) {
      expect(isContributionFundingType(type)).toBe(false);
    }
  });
});

const validGoalParams = {
  id: makeGoalId('9b2f2652-2a62-4a26-92aa-c3129b6a622c'),
  householdId: makeHouseholdId('3d9898a8-1d54-4468-9288-5e0e41d6b1d0'),
  name: 'Emergency Fund',
  target: usd('1000.00'),
  deadline: new Date('2027-06-30T00:00:00.000Z'),
};

describe('createGoal', () => {
  it('creates a Goal with a name, positive target, and deadline', () => {
    const result = createGoal(validGoalParams);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe('Emergency Fund');
    expect(result.value.target.toDecimal()).toBe('1000.00');
    expect(result.value.target.currency).toBe('USD');
  });

  it('trims the name', () => {
    const result = createGoal({ ...validGoalParams, name: '  Emergency Fund  ' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('Emergency Fund');
  });

  it('rejects an empty or whitespace-only name', () => {
    for (const name of ['', '   ']) {
      const result = createGoal({ ...validGoalParams, name });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('empty-name');
    }
  });

  it('rejects a non-positive target', () => {
    const result = createGoal({ ...validGoalParams, target: usd('0') });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('non-positive-target');
  });

  it('rejects an invalid deadline', () => {
    const result = createGoal({ ...validGoalParams, deadline: new Date('not-a-date') });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('invalid-deadline');
  });
});
