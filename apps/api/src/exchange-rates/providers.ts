import { z } from 'zod';

const frankfurterResponseSchema = z.object({
  base: z.string(),
  quote: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rate: z.union([z.string(), z.number()]),
});

const decimalSchema = z.union([z.string(), z.number()]);
const exchangeRateApiResponseSchema = z.object({
  result: z.string(),
  conversion_rate: decimalSchema.optional(),
  conversion_rates: z.record(decimalSchema).optional(),
});

export type ProviderRate = {
  baseCurrency: string;
  quoteCurrency: string;
  date: Date;
  rate: string;
  provider: string;
};

export function formatRateDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function fetchExchangeRateApiRate(
  baseCurrency: string,
  quoteCurrency: string,
  date: Date
): Promise<ProviderRate> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (apiKey === undefined || apiKey === '') {
    throw new Error('ExchangeRate-API key is not configured.');
  }

  const rateDate = formatRateDate(date);
  const today = formatRateDate(new Date());
  const endpoint =
    rateDate === today
      ? `pair/${baseCurrency}/${quoteCurrency}`
      : `history/${baseCurrency}/${rateDate.replaceAll('-', '/')}`;
  const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/${endpoint}`);
  if (!response.ok) {
    throw new Error(`ExchangeRate-API returned HTTP ${response.status}.`);
  }

  const data = exchangeRateApiResponseSchema.parse(await response.json());
  const rate = data.conversion_rate ?? data.conversion_rates?.[quoteCurrency];
  if (data.result !== 'success' || rate === undefined) {
    throw new Error('ExchangeRate-API did not return the requested rate.');
  }

  return {
    baseCurrency,
    quoteCurrency,
    date: new Date(`${rateDate}T00:00:00.000Z`),
    rate: String(rate),
    provider: 'exchange-rate-api',
  };
}

export async function fetchFrankfurterRate(
  baseCurrency: string,
  quoteCurrency: string,
  date: Date
): Promise<ProviderRate> {
  const rateDate = formatRateDate(date);
  const url = `https://api.frankfurter.dev/v2/rate/${baseCurrency}/${quoteCurrency}?date=${rateDate}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Frankfurter returned HTTP ${response.status}.`);
  }

  const data = frankfurterResponseSchema.parse(await response.json());
  return {
    baseCurrency: data.base.toUpperCase(),
    quoteCurrency: data.quote.toUpperCase(),
    date: new Date(`${data.date}T00:00:00.000Z`),
    rate: String(data.rate),
    provider: 'frankfurter',
  };
}
