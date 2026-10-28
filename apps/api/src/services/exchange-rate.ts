import { fetchExchangeRateApiRate, fetchFrankfurterRate } from '../exchange-rates/providers.js';
import type { ProviderRate } from '../exchange-rates/providers.js';
import { getPrisma } from '../prisma.js';

export async function findExchangeRateOnDate(
  baseCurrency: string,
  quoteCurrency: string,
  date: Date
) {
  return getPrisma().exchangeRate.findUnique({
    where: {
      baseCurrency_quoteCurrency_date: { baseCurrency, quoteCurrency, date },
    },
  });
}

export async function findLatestExchangeRate(
  baseCurrency: string,
  quoteCurrency: string,
  onOrBefore?: Date
) {
  return getPrisma().exchangeRate.findFirst({
    where: { baseCurrency, quoteCurrency, date: { lte: onOrBefore } },
    orderBy: { date: 'desc' },
  });
}

async function fetchProviderRate(
  baseCurrency: string,
  quoteCurrency: string,
  date: Date
): Promise<ProviderRate> {
  try {
    return await fetchExchangeRateApiRate(baseCurrency, quoteCurrency, date);
  } catch {
    return fetchFrankfurterRate(baseCurrency, quoteCurrency, date);
  }
}

export async function refreshExchangeRate(
  baseCurrency: string,
  quoteCurrency: string,
  date: Date
): Promise<ProviderRate> {
  const prisma = getPrisma();
  let providerRate: ProviderRate;
  try {
    providerRate = await fetchProviderRate(baseCurrency, quoteCurrency, date);
  } catch (providerError) {
    const cachedRate = await findLatestExchangeRate(baseCurrency, quoteCurrency, date);
    if (cachedRate === null) {
      throw providerError;
    }
    return {
      baseCurrency: cachedRate.baseCurrency,
      quoteCurrency: cachedRate.quoteCurrency,
      date: cachedRate.date,
      rate: cachedRate.rate.toString(),
      provider: cachedRate.provider,
    };
  }

  const cachedRate = await prisma.exchangeRate.upsert({
    where: {
      baseCurrency_quoteCurrency_date: {
        baseCurrency: providerRate.baseCurrency,
        quoteCurrency: providerRate.quoteCurrency,
        date: providerRate.date,
      },
    },
    create: providerRate,
    update: { rate: providerRate.rate, provider: providerRate.provider },
  });

  return {
    baseCurrency: cachedRate.baseCurrency,
    quoteCurrency: cachedRate.quoteCurrency,
    date: cachedRate.date,
    rate: cachedRate.rate.toString(),
    provider: cachedRate.provider,
  };
}
