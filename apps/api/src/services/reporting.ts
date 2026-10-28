import { AccountType, convertMoney, createMoney, isCurrencyCode } from '@prometheus/domain';
import type { Money, Result } from '@prometheus/domain';

import { getPrisma } from '../prisma.js';
import { listAccountsForHousehold } from './account.js';
import { findLatestExchangeRate } from './exchange-rate.js';

// Persisted balances and rates must be valid Money; failures indicate data corruption.
function expectMoney(result: Result<Money>): Money {
  if (!result.ok) {
    throw new Error(`Unexpected reporting currency conversion failure: ${result.error.type}`);
  }
  return result.value;
}

export async function getReportingSummary(householdId: string) {
  const prisma = getPrisma();
  const household = await prisma.household.findUniqueOrThrow({
    where: { id: householdId },
    select: { reportingCurrency: true },
  });
  if (!isCurrencyCode(household.reportingCurrency)) {
    throw new Error(`Unsupported Reporting Currency: ${household.reportingCurrency}`);
  }

  const reportingCurrency = household.reportingCurrency;
  const accounts = await listAccountsForHousehold(householdId);
  let netWorth = expectMoney(createMoney('0', reportingCurrency));
  let hasMissingRate = false;
  const convertedAccounts = [];

  for (const account of accounts) {
    if (!isCurrencyCode(account.currency)) {
      throw new Error(`Unsupported Account Currency: ${account.currency}`);
    }
    const balance = expectMoney(createMoney(account.balance, account.currency));
    const cachedRate =
      account.currency === reportingCurrency
        ? null
        : await findLatestExchangeRate(account.currency, reportingCurrency);
    const exchangeRate = account.currency === reportingCurrency ? '1' : cachedRate?.rate.toString();

    if (exchangeRate === undefined) {
      hasMissingRate = true;
      convertedAccounts.push({ ...account, convertedBalance: null, exchangeRate: null });
      continue;
    }

    const convertedBalance = expectMoney(convertMoney(balance, exchangeRate, reportingCurrency));
    const signedConvertedBalance =
      account.type === AccountType.Loan
        ? expectMoney(convertedBalance.multiply(-1n))
        : convertedBalance;
    netWorth = expectMoney(netWorth.add(signedConvertedBalance));
    convertedAccounts.push({
      ...account,
      convertedBalance: signedConvertedBalance.toDecimal(),
      exchangeRate,
    });
  }

  return {
    reportingCurrency,
    netWorth: hasMissingRate ? null : netWorth.toDecimal(),
    accounts: convertedAccounts,
  };
}
