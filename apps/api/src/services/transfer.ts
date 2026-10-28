import { convertMoney, createMoneyFromMinorUnits, isCurrencyCode } from '@prometheus/domain';
import type { Transfer } from '@prisma/client';

import { getPrisma } from '../prisma.js';
import {
  loanBalanceRemainsNonNegative,
  mapTransactionToRecord,
  parseAmountToMinorUnits,
  resolveTransactionExchangeRate,
  transactionInclude,
} from './transaction.js';
import type { TransactionRecord, TransactionWithRelations } from './transaction.js';

export type CreateTransferInput = {
  sourceAccountId: string;
  destinationAccountId: string;
  // Source amount as a decimal string in the source Account Currency.
  amount: string;
  // Destination amount; required when the Accounts use different Currencies.
  destinationAmount?: string;
  // Direct source-to-destination Exchange Rate; required cross-currency.
  exchangeRate?: string;
  date: Date;
  description?: string;
};

export type TransferErrorCode =
  | 'account-not-found'
  | 'same-account'
  | 'invalid-amount'
  | 'invalid-destination-amount'
  | 'missing-destination-amount'
  | 'invalid-exchange-rate'
  | 'missing-exchange-rate'
  | 'rate-amount-mismatch'
  | 'loan-overpayment'
  | 'exchange-rate-unavailable'
  | 'invalid-data';

export type TransferRecord = {
  id: string;
  householdId: string;
  exchangeRate: string | null;
  sourceTransaction: TransactionRecord;
  destinationTransaction: TransactionRecord;
};

export type CreateTransferResult =
  { ok: true; transfer: TransferRecord } | { ok: false; error: TransferErrorCode };

type TransferWithRelations = Transfer & {
  sourceTransaction: TransactionWithRelations;
  destinationTransaction: TransactionWithRelations;
};

const transferInclude = {
  sourceTransaction: { include: transactionInclude },
  destinationTransaction: { include: transactionInclude },
};

function mapTransferToRecord(transfer: TransferWithRelations): TransferRecord {
  return {
    id: transfer.id,
    householdId: transfer.householdId,
    exchangeRate: transfer.exchangeRate?.toString() ?? null,
    sourceTransaction: mapTransactionToRecord(transfer.sourceTransaction),
    destinationTransaction: mapTransactionToRecord(transfer.destinationTransaction),
  };
}

async function findAccountInHousehold(accountId: string, householdId: string) {
  const prisma = getPrisma();
  return prisma.account.findFirst({ where: { id: accountId, householdId } });
}

// Cross-currency Transfers must convert exactly: the stored rate applied to
// the source amount must reproduce the destination amount.
function amountsCoherentWithRate(
  sourceMinorUnits: bigint,
  sourceCurrency: string,
  destinationMinorUnits: bigint,
  destinationCurrency: string,
  exchangeRate: string
): boolean {
  if (!isCurrencyCode(sourceCurrency) || !isCurrencyCode(destinationCurrency)) {
    return false;
  }
  const source = createMoneyFromMinorUnits(sourceMinorUnits, sourceCurrency);
  if (!source.ok) {
    return false;
  }
  const converted = convertMoney(source.value, exchangeRate, destinationCurrency);
  return converted.ok && converted.value.toMinorUnits() === destinationMinorUnits;
}

export async function createTransfer(
  input: CreateTransferInput,
  householdId: string
): Promise<CreateTransferResult> {
  const sourceAccount = await findAccountInHousehold(input.sourceAccountId, householdId);
  if (sourceAccount === null) {
    return { ok: false, error: 'account-not-found' };
  }
  const destinationAccount = await findAccountInHousehold(input.destinationAccountId, householdId);
  if (destinationAccount === null) {
    return { ok: false, error: 'account-not-found' };
  }
  if (sourceAccount.id === destinationAccount.id) {
    return { ok: false, error: 'same-account' };
  }

  const sourceAmountResult = parseAmountToMinorUnits(input.amount, sourceAccount);
  if (!sourceAmountResult.ok) {
    return { ok: false, error: 'invalid-amount' };
  }

  const crossCurrency = sourceAccount.currency !== destinationAccount.currency;
  let destinationMinorUnits = sourceAmountResult.minorUnits;
  let storedExchangeRate: string | null = null;

  if (crossCurrency) {
    if (input.exchangeRate === undefined) {
      return { ok: false, error: 'missing-exchange-rate' };
    }
    if (input.destinationAmount === undefined) {
      return { ok: false, error: 'missing-destination-amount' };
    }
    const destinationAmountResult = parseAmountToMinorUnits(
      input.destinationAmount,
      destinationAccount
    );
    if (!destinationAmountResult.ok) {
      return { ok: false, error: 'invalid-destination-amount' };
    }
    destinationMinorUnits = destinationAmountResult.minorUnits;
    if (
      !amountsCoherentWithRate(
        sourceAmountResult.minorUnits,
        sourceAccount.currency,
        destinationMinorUnits,
        destinationAccount.currency,
        input.exchangeRate
      )
    ) {
      return { ok: false, error: 'rate-amount-mismatch' };
    }
    storedExchangeRate = input.exchangeRate;
  } else if (input.destinationAmount !== undefined) {
    const destinationAmountResult = parseAmountToMinorUnits(
      input.destinationAmount,
      destinationAccount
    );
    if (
      !destinationAmountResult.ok ||
      destinationAmountResult.minorUnits !== sourceAmountResult.minorUnits
    ) {
      return { ok: false, error: 'invalid-destination-amount' };
    }
  }

  const sourceLoanValid = await loanBalanceRemainsNonNegative(
    sourceAccount,
    'EXPENSE',
    sourceAmountResult.minorUnits
  );
  if (!sourceLoanValid) {
    return { ok: false, error: 'loan-overpayment' };
  }
  const destinationLoanValid = await loanBalanceRemainsNonNegative(
    destinationAccount,
    'INCOME',
    destinationMinorUnits
  );
  if (!destinationLoanValid) {
    return { ok: false, error: 'loan-overpayment' };
  }

  const sourceSnapshot = await resolveTransactionExchangeRate(
    sourceAccount.currency,
    householdId,
    input.date
  );
  if (sourceSnapshot === null) {
    return { ok: false, error: 'exchange-rate-unavailable' };
  }
  const destinationSnapshot = await resolveTransactionExchangeRate(
    destinationAccount.currency,
    householdId,
    input.date
  );
  if (destinationSnapshot === null) {
    return { ok: false, error: 'exchange-rate-unavailable' };
  }

  const prisma = getPrisma();
  const transfer = await prisma.$transaction(async (tx) => {
    const sourceTransaction = await tx.transaction.create({
      data: {
        householdId,
        accountId: sourceAccount.id,
        type: 'EXPENSE',
        amount: sourceAmountResult.minorUnits,
        date: input.date,
        description: input.description ?? '',
        reportingCurrency: sourceSnapshot.reportingCurrency,
        exchangeRate: sourceSnapshot.exchangeRate,
      },
    });
    const destinationTransaction = await tx.transaction.create({
      data: {
        householdId,
        accountId: destinationAccount.id,
        type: 'INCOME',
        amount: destinationMinorUnits,
        date: input.date,
        description: input.description ?? '',
        reportingCurrency: destinationSnapshot.reportingCurrency,
        exchangeRate: destinationSnapshot.exchangeRate,
      },
    });
    return tx.transfer.create({
      data: {
        householdId,
        sourceTransactionId: sourceTransaction.id,
        destinationTransactionId: destinationTransaction.id,
        exchangeRate: storedExchangeRate,
      },
      include: transferInclude,
    });
  });

  return { ok: true, transfer: mapTransferToRecord(transfer) };
}

export async function findTransferById(
  transferId: string,
  householdId: string
): Promise<TransferRecord | null> {
  const prisma = getPrisma();
  const transfer = await prisma.transfer.findFirst({
    where: { id: transferId, householdId },
    include: transferInclude,
  });
  if (transfer === null) {
    return null;
  }
  return mapTransferToRecord(transfer);
}
