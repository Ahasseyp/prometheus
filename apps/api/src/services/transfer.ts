import { convertMoney, createMoneyFromMinorUnits, isCurrencyCode } from '@prometheus/domain';
import type { Transfer } from '@prisma/client';

import { getPrisma } from '../prisma.js';
import { findAccountInHousehold } from './account.js';
import {
  amountFitsCurrency,
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
  | 'amount-incompatible-with-account'
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

type ReportingSnapshot = { reportingCurrency: string; exchangeRate: string };

// Both sides must keep Loan Balances non-negative. Updates pass the ids of
// the Transactions being replaced so the check evaluates the new state.
async function checkSideLoanBalances(input: {
  sourceAccount: Parameters<typeof loanBalanceRemainsNonNegative>[0];
  destinationAccount: Parameters<typeof loanBalanceRemainsNonNegative>[0];
  sourceMinorUnits: bigint;
  destinationMinorUnits: bigint;
  sourceExcludedId?: string;
  destinationExcludedId?: string;
}): Promise<boolean> {
  const sourceValid = await loanBalanceRemainsNonNegative(
    input.sourceAccount,
    'EXPENSE',
    input.sourceMinorUnits,
    input.sourceExcludedId
  );
  if (!sourceValid) {
    return false;
  }
  return loanBalanceRemainsNonNegative(
    input.destinationAccount,
    'INCOME',
    input.destinationMinorUnits,
    input.destinationExcludedId
  );
}

// Creation always resolves fresh reporting snapshots for both sides.
async function resolveSideSnapshots(input: {
  sourceCurrency: string;
  destinationCurrency: string;
  householdId: string;
  date: Date;
}): Promise<
  { ok: true; source: ReportingSnapshot; destination: ReportingSnapshot } | { ok: false }
> {
  const source = await resolveTransactionExchangeRate(
    input.sourceCurrency,
    input.householdId,
    input.date
  );
  const destination = await resolveTransactionExchangeRate(
    input.destinationCurrency,
    input.householdId,
    input.date
  );
  if (source === null || destination === null) {
    return { ok: false };
  }
  return { ok: true, source, destination };
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

  const sourceAmountResult = parseAmountToMinorUnits(input.amount, sourceAccount.currency);
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
      destinationAccount.currency
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
      destinationAccount.currency
    );
    if (
      !destinationAmountResult.ok ||
      destinationAmountResult.minorUnits !== sourceAmountResult.minorUnits
    ) {
      return { ok: false, error: 'invalid-destination-amount' };
    }
  }

  const loansValid = await checkSideLoanBalances({
    sourceAccount,
    destinationAccount,
    sourceMinorUnits: sourceAmountResult.minorUnits,
    destinationMinorUnits,
  });
  if (!loansValid) {
    return { ok: false, error: 'loan-overpayment' };
  }

  const snapshots = await resolveSideSnapshots({
    sourceCurrency: sourceAccount.currency,
    destinationCurrency: destinationAccount.currency,
    householdId,
    date: input.date,
  });
  if (!snapshots.ok) {
    return { ok: false, error: 'exchange-rate-unavailable' };
  }
  const { source: sourceSnapshot, destination: destinationSnapshot } = snapshots;

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

export type UpdateTransferInput = {
  sourceAccountId?: string;
  destinationAccountId?: string;
  amount?: string;
  destinationAmount?: string;
  exchangeRate?: string;
  date?: Date;
  description?: string;
};

export type UpdateTransferResult =
  { ok: true; transfer: TransferRecord } | { ok: false; error: TransferErrorCode | 'not-found' };

// Resolves the minor units for one side of an update: the new amount when
// given, otherwise the stored amount — which is only portable to a new Account
// when it has no fractional digits below the new currency's exponent.
async function resolveSideMinorUnits(input: {
  amount: string | undefined;
  accountChanged: boolean;
  storedMinorUnits: bigint;
  fromCurrency: string;
  toCurrency: string;
  invalidError: 'invalid-amount' | 'invalid-destination-amount';
}): Promise<{ ok: true; minorUnits: bigint } | { ok: false; error: TransferErrorCode }> {
  if (input.amount !== undefined) {
    const parsed = parseAmountToMinorUnits(input.amount, input.toCurrency);
    if (!parsed.ok) {
      return { ok: false, error: input.invalidError };
    }
    return { ok: true, minorUnits: parsed.minorUnits };
  }
  if (input.accountChanged) {
    if (!amountFitsCurrency(input.storedMinorUnits, input.fromCurrency, input.toCurrency)) {
      return { ok: false, error: 'amount-incompatible-with-account' };
    }
  }
  return { ok: true, minorUnits: input.storedMinorUnits };
}

export async function updateTransfer(
  transferId: string,
  householdId: string,
  input: UpdateTransferInput
): Promise<UpdateTransferResult> {
  const prisma = getPrisma();
  const existing = await prisma.transfer.findFirst({
    where: { id: transferId, householdId },
    include: transferInclude,
  });
  if (existing === null) {
    return { ok: false, error: 'not-found' };
  }

  const sourceAccount = await findAccountInHousehold(
    input.sourceAccountId ?? existing.sourceTransaction.accountId,
    householdId
  );
  if (sourceAccount === null) {
    return { ok: false, error: 'account-not-found' };
  }
  const destinationAccount = await findAccountInHousehold(
    input.destinationAccountId ?? existing.destinationTransaction.accountId,
    householdId
  );
  if (destinationAccount === null) {
    return { ok: false, error: 'account-not-found' };
  }
  if (sourceAccount.id === destinationAccount.id) {
    return { ok: false, error: 'same-account' };
  }

  const sourceAccountChanged = sourceAccount.id !== existing.sourceTransaction.accountId;
  const destinationAccountChanged =
    destinationAccount.id !== existing.destinationTransaction.accountId;

  const sourceAmount = await resolveSideMinorUnits({
    amount: input.amount,
    accountChanged: sourceAccountChanged,
    storedMinorUnits: existing.sourceTransaction.amount,
    fromCurrency: existing.sourceTransaction.account.currency,
    toCurrency: sourceAccount.currency,
    invalidError: 'invalid-amount',
  });
  if (!sourceAmount.ok) {
    return sourceAmount;
  }

  const requestedDestinationAmount = await resolveSideMinorUnits({
    amount: input.destinationAmount,
    accountChanged: destinationAccountChanged,
    storedMinorUnits: existing.destinationTransaction.amount,
    fromCurrency: existing.destinationTransaction.account.currency,
    toCurrency: destinationAccount.currency,
    invalidError: 'invalid-destination-amount',
  });
  if (!requestedDestinationAmount.ok) {
    return requestedDestinationAmount;
  }

  const crossCurrency = sourceAccount.currency !== destinationAccount.currency;

  // Same-currency Transfers share one amount, so the destination side mirrors
  // the source unless an equal destination amount was supplied and validated.
  const destinationMinorUnits =
    crossCurrency || input.destinationAmount !== undefined
      ? requestedDestinationAmount.minorUnits
      : sourceAmount.minorUnits;

  let storedExchangeRate: string | null = null;
  if (crossCurrency) {
    const rate = input.exchangeRate ?? existing.exchangeRate?.toString();
    if (rate === undefined) {
      return { ok: false, error: 'missing-exchange-rate' };
    }
    if (
      !amountsCoherentWithRate(
        sourceAmount.minorUnits,
        sourceAccount.currency,
        destinationMinorUnits,
        destinationAccount.currency,
        rate
      )
    ) {
      return { ok: false, error: 'rate-amount-mismatch' };
    }
    storedExchangeRate = rate;
  } else {
    if (input.exchangeRate !== undefined) {
      return { ok: false, error: 'invalid-exchange-rate' };
    }
    if (
      input.destinationAmount !== undefined &&
      destinationMinorUnits !== sourceAmount.minorUnits
    ) {
      return { ok: false, error: 'invalid-destination-amount' };
    }
  }

  const loansValid = await checkSideLoanBalances({
    sourceAccount,
    destinationAccount,
    sourceMinorUnits: sourceAmount.minorUnits,
    destinationMinorUnits,
    sourceExcludedId: existing.sourceTransactionId,
    destinationExcludedId: existing.destinationTransactionId,
  });
  if (!loansValid) {
    return { ok: false, error: 'loan-overpayment' };
  }

  const targetDate = input.date ?? existing.sourceTransaction.date;
  const dateChanged = targetDate.getTime() !== existing.sourceTransaction.date.getTime();
  const sourceChanged = sourceAccountChanged || dateChanged;
  const destinationChanged = destinationAccountChanged || dateChanged;

  // Reporting snapshots are refreshed only for the sides whose Account or
  // date changed; untouched sides keep their stored (possibly overridden) rate.
  let sourceSnapshot: ReportingSnapshot | null = null;
  if (sourceChanged) {
    sourceSnapshot = await resolveTransactionExchangeRate(
      sourceAccount.currency,
      householdId,
      targetDate
    );
    if (sourceSnapshot === null) {
      return { ok: false, error: 'exchange-rate-unavailable' };
    }
  }
  let destinationSnapshot: ReportingSnapshot | null = null;
  if (destinationChanged) {
    destinationSnapshot = await resolveTransactionExchangeRate(
      destinationAccount.currency,
      householdId,
      targetDate
    );
    if (destinationSnapshot === null) {
      return { ok: false, error: 'exchange-rate-unavailable' };
    }
  }

  const transfer = await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: existing.sourceTransactionId },
      data: {
        accountId: sourceAccount.id,
        amount: sourceAmount.minorUnits,
        date: targetDate,
        description: input.description ?? existing.sourceTransaction.description,
        ...(sourceSnapshot === null
          ? {}
          : {
              reportingCurrency: sourceSnapshot.reportingCurrency,
              exchangeRate: sourceSnapshot.exchangeRate,
              exchangeRateOverridden: false,
            }),
      },
    });
    await tx.transaction.update({
      where: { id: existing.destinationTransactionId },
      data: {
        accountId: destinationAccount.id,
        amount: destinationMinorUnits,
        date: targetDate,
        description: input.description ?? existing.destinationTransaction.description,
        ...(destinationSnapshot === null
          ? {}
          : {
              reportingCurrency: destinationSnapshot.reportingCurrency,
              exchangeRate: destinationSnapshot.exchangeRate,
              exchangeRateOverridden: false,
            }),
      },
    });
    return tx.transfer.update({
      where: { id: existing.id },
      data: { exchangeRate: storedExchangeRate },
      include: transferInclude,
    });
  });

  return { ok: true, transfer: mapTransferToRecord(transfer) };
}

export type DeleteTransferResult = { ok: true } | { ok: false; reason: 'not-found' };

export async function deleteTransfer(
  transferId: string,
  householdId: string
): Promise<DeleteTransferResult> {
  const prisma = getPrisma();
  const existing = await prisma.transfer.findFirst({
    where: { id: transferId, householdId },
    select: { id: true, sourceTransactionId: true, destinationTransactionId: true },
  });
  if (existing === null) {
    return { ok: false, reason: 'not-found' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.transfer.delete({ where: { id: existing.id } });
    await tx.transaction.deleteMany({
      where: { id: { in: [existing.sourceTransactionId, existing.destinationTransactionId] } },
    });
  });
  return { ok: true };
}
