import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { invalidateTransactionData } from './transactions.js';

describe('invalidateTransactionData', () => {
  it('invalidates transactions, accounts, reporting, and budget queries', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateTransactionData(queryClient);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions', 'list'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['accounts', 'list'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reporting', 'summary'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['budgets'] });
  });
});
