import { http, HttpResponse } from 'msw';

import { server } from './server.js';
import { makeTransaction } from './transaction-helpers.js';

export type TransferFixture = {
  id: string;
  householdId: string;
  exchangeRate: string | null;
  sourceTransaction: unknown;
  destinationTransaction: unknown;
};

export function makeTransfer(overrides: Partial<TransferFixture> = {}): TransferFixture {
  return {
    id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
    householdId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    exchangeRate: null,
    sourceTransaction: makeTransaction({ type: 'expense', description: 'Transfer' }),
    destinationTransaction: makeTransaction({
      type: 'income',
      description: 'Transfer',
      accountId: 'e5f6a7b8-c9d0-1234-efab-345678901234',
      accountName: 'Savings',
    }),
    ...overrides,
  };
}

export function mockCreateTransferResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/transfer.create', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockCreateTransferError(message = 'Something went wrong.') {
  server.use(
    http.post('/api/trpc/transfer.create', () => {
      return HttpResponse.json(
        { error: { message, code: -32600, data: { code: 'BAD_REQUEST', httpStatus: 400 } } },
        { status: 400 }
      );
    })
  );
}

// The two linked Transaction halves of one Transfer as the transaction list
// returns them: each side carries the other side's Account as counterparty,
// and neither has a Category.
export function makeTransferSideTransactions() {
  const transferId = 'd4e5f6a7-b8c9-0123-defa-234567890123';
  const checkingId = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
  const savingsId = 'e5f6a7b8-c9d0-1234-efab-345678901234';

  return {
    source: makeTransaction({
      type: 'expense',
      amount: '100.00',
      description: 'Transfer to Savings',
      categoryId: null,
      categoryName: null,
      transfer: {
        id: transferId,
        counterpartyAccountId: savingsId,
        counterpartyAccountName: 'Savings',
      },
    }),
    destination: makeTransaction({
      type: 'income',
      amount: '100.00',
      description: 'Transfer from Everyday Checking',
      accountId: savingsId,
      accountName: 'Savings',
      categoryId: null,
      categoryName: null,
      transfer: {
        id: transferId,
        counterpartyAccountId: checkingId,
        counterpartyAccountName: 'Everyday Checking',
      },
    }),
  };
}
