import { describe, expect, it } from 'vitest';
import { createMoney } from './index.js';

describe('packages/domain exports', () => {
  it('exports the Money factory from the package entry point', () => {
    const result = createMoney('1.00', 'USD');
    expect(result.ok).toBe(true);
  });
});
