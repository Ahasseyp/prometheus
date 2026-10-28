import { AccountType, convertMoney, createMoney, isCurrencyCode } from '@prometheus/domain';
import type { Money, Result } from '@prometheus/domain';

import { getPrisma } from '../prisma.js';
import { listAccountsForHousehold } from './account.js';

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
        : await prisma.exchangeRate.findFirst({
            where: { baseCurrency: account.currency, quoteCurrency: reportingCurrency },
            orderBy: { date: 'desc' },
          });
    const exchangeRate = account.currency === reportingCurrency ? '1' : cachedRate?.rate.toString();

    if (exchangeRate === undefined) {
      hasMissingRate = true;
      convertedAccounts.push({ ...account, convertedBalance: null, exchangeRate: null });
      continue;
    }

    const convertedBalance = expectMoney(convertMoney(balance, exchangeRate, reportingCurrency));
    netWorth = expectMoney(
      account.type === AccountType.Loan
        ? netWorth.subtract(convertedBalance)
        : netWorth.add(convertedBalance)
    );
    convertedAccounts.push({
      ...account,
      convertedBalance: convertedBalance.toDecimal(),
      exchangeRate,
    });
  }

  return {
    reportingCurrency,
    netWorth: hasMissingRate ? null : netWorth.toDecimal(),
    accounts: convertedAccounts,
  };
}
