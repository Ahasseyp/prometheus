import { getPrisma } from '../prisma.js';
import { refreshExchangeRate } from '../services/exchange-rate.js';

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function refreshActiveHouseholdExchangeRates(): Promise<void> {
  const prisma = getPrisma();
  const households = await prisma.household.findMany({
    select: { reportingCurrency: true, accounts: { select: { currency: true } } },
  });
  const currencyPairs = new Map<string, { baseCurrency: string; quoteCurrency: string }>();
  for (const household of households) {
    for (const account of household.accounts) {
      if (account.currency !== household.reportingCurrency) {
        const pair = {
          baseCurrency: account.currency,
          quoteCurrency: household.reportingCurrency,
        };
        currencyPairs.set(`${pair.baseCurrency}:${pair.quoteCurrency}`, pair);
      }
    }
  }

  for (const pair of currencyPairs.values()) {
    try {
      await refreshExchangeRate(pair.baseCurrency, pair.quoteCurrency, new Date());
    } catch (error) {
      console.error(
        `Failed to refresh Exchange Rate ${pair.baseCurrency}:${pair.quoteCurrency}.`,
        error
      );
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
