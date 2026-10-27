import { getPrisma } from '../prisma.js';
import { refreshExchangeRate } from '../services/exchange-rate.js';

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function refreshActiveHouseholdExchangeRates(): Promise<void> {
  const prisma = getPrisma();
  const households = await prisma.household.findMany({
    select: { reportingCurrency: true, accounts: { select: { currency: true } } },
  });
  const currencyPairs = new Set<string>();
  for (const household of households) {
    for (const account of household.accounts) {
      if (account.currency !== household.reportingCurrency) {
        currencyPairs.add(`${account.currency}:${household.reportingCurrency}`);
      }
    }
  }

  for (const pair of currencyPairs) {
    const [baseCurrency, quoteCurrency] = pair.split(':');
    if (baseCurrency === undefined || quoteCurrency === undefined) {
      continue;
    }
    try {
      await refreshExchangeRate(baseCurrency, quoteCurrency, new Date());
    } catch (error) {
      console.error(`Failed to refresh Exchange Rate ${pair}.`, error);
    }
  }
}

export function startExchangeRateRefreshSchedule(): NodeJS.Timeout {
  void refreshActiveHouseholdExchangeRates();
  const timer = setInterval(() => {
    void refreshActiveHouseholdExchangeRates();
  }, REFRESH_INTERVAL_MS);
  timer.unref();
  return timer;
}
