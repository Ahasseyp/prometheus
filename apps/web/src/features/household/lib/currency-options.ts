const supportedCurrencyCodes = [
  'AED',
  'AUD',
  'BRL',
  'CAD',
  'CHF',
  'CLP',
  'CNY',
  'COP',
  'DKK',
  'EUR',
  'GBP',
  'HKD',
  'ILS',
  'INR',
  'JPY',
  'KRW',
  'MXN',
  'NOK',
  'NZD',
  'PEN',
  'PLN',
  'SAR',
  'SEK',
  'SGD',
  'TRY',
  'USD',
  'ZAR',
] as const;

export type CurrencyCode = (typeof supportedCurrencyCodes)[number];

export type CurrencyOption = {
  code: CurrencyCode;
  label: string;
};

function getCurrencyDisplayNames(): Intl.DisplayNames | undefined {
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en';

  try {
    return new Intl.DisplayNames(locale, { type: 'currency' });
  } catch {
    return undefined;
  }
}

export function getCurrencyOptions(): CurrencyOption[] {
  const displayNames = getCurrencyDisplayNames();

  return supportedCurrencyCodes
    .map((code) => ({
      code,
      label: displayNames?.of(code) ?? code,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
