import { describe, expect, it } from 'vitest';

import { createGoal } from './goal.js';
import { makeGoalId, makeHouseholdId } from './ids.js';
import { createMoney } from './money.js';

function usd(amount: string) {
  const result = createMoney(amount, 'USD');
  if (!result.ok) throw new Error('expected valid money');
  return result.value;
}

const validParams = {
  id: makeGoalId('9b2f2652-2a62-4a26-92aa-c3129b6a622c'),
  householdId: makeHouseholdId('3d9898a8-1d54-4468-9288-5e0e41d6b1d0'),
  name: 'Emergency Fund',
  target: usd('1000.00'),
  deadline: new Date('2027-06-30T00:00:00.000Z'),
};

describe('createGoal', () => {
  it('creates a Goal with a name, positive target, and deadline', () => {
    const result = createGoal(validParams);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(validParams.id);
    expect(result.value.householdId).toBe(validParams.householdId);
    expect(result.value.name).toBe('Emergency Fund');
    expect(result.value.target.toDecimal()).toBe('1000.00');
    expect(result.value.target.currency).toBe('USD');
    expect(result.value.deadline).toEqual(validParams.deadline);
  });

  it('rejects an empty or whitespace-only name', () => {
    for (const name of ['', '   ']) {
      const result = createGoal({ ...validParams, name });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('empty-name');
    }
  });

  it('trims the name', () => {
    const result = createGoal({ ...validParams, name: '  Emergency Fund  ' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('Emergency Fund');
  });

  it('rejects a non-positive target', () => {
    for (const target of [usd('0'), usd('-10')]) {
      const result = createGoal({ ...validParams, target });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('non-positive-target');
    }
  });

  it('rejects an invalid deadline', () => {
    const result = createGoal({ ...validParams, deadline: new Date('not-a-date') });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('invalid-deadline');
  });
});
