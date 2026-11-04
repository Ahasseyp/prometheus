import { convertMoney, createMoney, isCurrencyCode } from '@prometheus/domain';

import { findAccountInHousehold } from '../services/account.js';
import { findExchangeRateOnDate, refreshExchangeRate } from '../services/exchange-rate.js';
import { createTransaction } from '../services/transaction.js';
import { transactionErrorMappings } from '../transaction.js';
import { createTransfer } from '../services/transfer.js';
import { transferErrorMappings } from '../transfer.js';

import type { ResolvedTransactionCommand, ResolvedTransferCommand } from './add-command.js';

export type ExecuteCommandResult =
  { ok: true; created: Record<string, unknown> } | { ok: false; error: string };

/**
 * Resolves the exchange rate between two currencies on a date, preferring the
 * cached rate and falling back to the provider. Returns null when no rate is
 * available.
 */
async function findRate(from: string, to: string, date: Date): Promise<string | null> {
  const cached = await findExchangeRateOnDate(from, to, date);
  if (cached !== null) return cached.rate.toString();
  try {
    const fresh = await refreshExchangeRate(from, to, date);
    return fresh.rate;
  } catch {
    return null;
  }
}

/**
 * Converts an amount expressed in the parsed currency into the account's
 * currency, so the confirmed entry records the amount the user meant.
 */
async function convertToAccountCurrency(
  amount: string,
  parsedCurrency: string,
  accountCurrency: string,
  date: Date
): Promise<{ ok: true; amount: string } | { ok: false; error: string }> {
  if (!isCurrencyCode(parsedCurrency) || !isCurrencyCode(accountCurrency)) {
    return { ok: false, error: `I could not interpret "${parsedCurrency}" as a currency.` };
  }

  if (parsedCurrency === accountCurrency) {
    return { ok: true, amount };
  }

  const money = createMoney(amount, parsedCurrency);
  if (!money.ok) {
    return { ok: false, error: `I could not interpret "${amount}" as an amount.` };
  }

  const rate = await findRate(parsedCurrency, accountCurrency, date);
  if (rate === null) {
    return {
      ok: false,
      error: `I could not find an exchange rate from ${parsedCurrency} to ${accountCurrency} for that date. Try the form instead.`,
    };
  }

  const converted = convertMoney(money.value, rate, accountCurrency);
  if (!converted.ok) {
    return { ok: false, error: `I could not convert ${parsedCurrency} to ${accountCurrency}.` };
  }
  return { ok: true, amount: converted.value.toDecimal() };
}

async function executeTransaction(
  householdId: string,
  command: ResolvedTransactionCommand
): Promise<ExecuteCommandResult> {
  if (command.accountId === undefined || command.categoryId === undefined) {
    return { ok: false, error: 'The command is missing its account or category.' };
  }

  const account = await findAccountInHousehold(command.accountId, householdId);
  if (account === null) {
    return { ok: false, error: 'Account not found.' };
  }

  const date = new Date(command.date);
  const conversion = await convertToAccountCurrency(
    command.amount,
    command.currency,
    account.currency,
    date
  );
  if (!conversion.ok) return conversion;

  const result = await createTransaction(
    {
      type: command.type,
      amount: conversion.amount,
      accountId: command.accountId,
      categoryId: command.categoryId,
      date,
      description: command.description,
    },
    householdId
  );
  if (!result.ok) {
    return { ok: false, error: transactionErrorMappings[result.error].message };
  }
  return { ok: true, created: result.transaction as unknown as Record<string, unknown> };
}

async function executeTransfer(
  householdId: string,
  command: ResolvedTransferCommand
): Promise<ExecuteCommandResult> {
  if (command.fromAccountId === undefined || command.toAccountId === undefined) {
    return { ok: false, error: 'The command is missing its accounts.' };
  }

  const sourceAccount = await findAccountInHousehold(command.fromAccountId, householdId);
  const destinationAccount = await findAccountInHousehold(command.toAccountId, householdId);
  if (sourceAccount === null || destinationAccount === null) {
    return { ok: false, error: 'Account not found.' };
  }

  const date = new Date(command.date);
  const sourceConversion = await convertToAccountCurrency(
    command.amount,
    command.currency,
    sourceAccount.currency,
    date
  );
  if (!sourceConversion.ok) return sourceConversion;

  let destinationAmount: string | undefined;
  let exchangeRate: string | undefined;
  if (sourceAccount.currency !== destinationAccount.currency) {
    if (!isCurrencyCode(sourceAccount.currency) || !isCurrencyCode(destinationAccount.currency)) {
      return { ok: false, error: `I could not interpret one of the account currencies.` };
    }
    // The destination amount and rate must be coherent (the Transfer service
    // verifies convertMoney(source, rate, dest) reproduces the destination
    // amount), so derive the destination from the same converted source.
    const crossRate = await findRate(sourceAccount.currency, destinationAccount.currency, date);
    if (crossRate === null) {
      return {
        ok: false,
        error: `I could not find an exchange rate from ${sourceAccount.currency} to ${destinationAccount.currency} for that date. Try the form instead.`,
      };
    }
    exchangeRate = crossRate;
    const sourceMoney = createMoney(sourceConversion.amount, sourceAccount.currency);
    const convertedDestination =
      sourceMoney.ok && convertMoney(sourceMoney.value, exchangeRate, destinationAccount.currency);
    if (!convertedDestination || !convertedDestination.ok) {
      return { ok: false, error: `I could not convert to ${destinationAccount.currency}.` };
    }
    destinationAmount = convertedDestination.value.toDecimal();
  }

  const result = await createTransfer(
    {
      sourceAccountId: command.fromAccountId,
      destinationAccountId: command.toAccountId,
      amount: sourceConversion.amount,
      destinationAmount,
      exchangeRate,
      date,
      description: command.description,
    },
    householdId
  );
  if (!result.ok) {
    return { ok: false, error: transferErrorMappings[result.error].message };
  }
  return { ok: true, created: result.transfer as unknown as Record<string, unknown> };
}

/**
 * Executes a resolved Add Command server-side. Runs the LLM-extracted amount
 * through the exchange-rate seam into the account's currency before reusing
 * the Transaction/Transfer services end-to-end (balances, snapshots).
 */
export async function executeCommand(
  householdId: string,
  command: ResolvedTransactionCommand | ResolvedTransferCommand
): Promise<ExecuteCommandResult> {
  if (command.kind === 'add-transfer') {
    return executeTransfer(householdId, command);
  }
  return executeTransaction(householdId, command);
}
