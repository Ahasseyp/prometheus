import { isCurrencyCode } from '@prometheus/domain';

import { type CurrencyCode } from './currency-options.js';

const regionCurrencyMap: Record<string, CurrencyCode> = {
  AE: 'AED',
  AU: 'AUD',
  BR: 'BRL',
  CA: 'CAD',
  CH: 'CHF',
  CL: 'CLP',
  CN: 'CNY',
  CO: 'COP',
  DE: 'EUR',
  DK: 'DKK',
  ES: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  GB: 'GBP',
  HK: 'HKD',
  IE: 'EUR',
  IL: 'ILS',
  IN: 'INR',
  IT: 'EUR',
  JP: 'JPY',
  KR: 'KRW',
  MX: 'MXN',
  NL: 'EUR',
  NO: 'NOK',
  NZ: 'NZD',
  PE: 'PEN',
  PL: 'PLN',
  PT: 'EUR',
  SA: 'SAR',
  SE: 'SEK',
  SG: 'SGD',
  TR: 'TRY',
  US: 'USD',
  ZA: 'ZAR',
};

/**
 * Returns the best default reporting currency for the current user.
 *
 * The default is derived from `navigator.language` when running in a browser:
 * the user's region is mapped to a supported currency code, and that currency
 * is selected if the project supports it. If the region can't be parsed, isn't
 * mapped, or the mapped currency isn't supported, the function falls back to
 * USD.
 */
export function getDefaultCurrency(): CurrencyCode {
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

  try {
    const region = new Intl.Locale(locale).region;
    const candidate = region ? regionCurrencyMap[region] : undefined;

    if (candidate && isCurrencyCode(candidate)) {
      return candidate;
    }
  } catch {
    // Fall back to USD if the locale can't be parsed.
  }

  return 'USD';
}
