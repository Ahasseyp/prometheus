import {
  AED,
  AUD,
  BRL,
  CAD,
  CHF,
  CLP,
  CNY,
  COP,
  DKK,
  EUR,
  GBP,
  HKD,
  ILS,
  INR,
  JPY,
  KRW,
  MXN,
  NOK,
  NZD,
  PEN,
  PLN,
  SAR,
  SEK,
  SGD,
  TRY,
  USD,
  ZAR,
  type DineroCurrency,
} from 'dinero.js/bigint';

export const currencyMap = {
  AED,
  AUD,
  BRL,
  CAD,
  CHF,
  CLP,
  CNY,
  COP,
  DKK,
  EUR,
  GBP,
  HKD,
  ILS,
  INR,
  JPY,
  KRW,
  MXN,
  NOK,
  NZD,
  PEN,
  PLN,
  SAR,
  SEK,
  SGD,
  TRY,
  USD,
  ZAR,
};

export type CurrencyCode = keyof typeof currencyMap;

export function isCurrencyCode(code: string): code is CurrencyCode {
  return code in currencyMap;
}

export function currencyFor(code: string): DineroCurrency<bigint, CurrencyCode> | undefined {
  return isCurrencyCode(code)
    ? (currencyMap[code] as DineroCurrency<bigint, CurrencyCode>)
    : undefined;
}
