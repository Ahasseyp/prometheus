import { z } from 'zod';
import { isCurrencyCode } from '@prometheus/domain';

import { refreshExchangeRate } from './services/exchange-rate.js';
import { protectedProcedure, router } from './trpc.js';

const currencyCodeSchema = z.string().refine(isCurrencyCode, { message: 'Unsupported currency.' });

const refreshExchangeRateInputSchema = z.object({
  baseCurrency: currencyCodeSchema,
  quoteCurrency: currencyCodeSchema,
  date: z.coerce.date().default(() => new Date()),
});

const exchangeRateResponseSchema = z.object({
  baseCurrency: z.string(),
  quoteCurrency: z.string(),
  date: z.date(),
  rate: z.string(),
  provider: z.string(),
});

export const exchangeRateRouter = router({
  refresh: protectedProcedure
    .input(refreshExchangeRateInputSchema)
    .output(exchangeRateResponseSchema)
    .mutation(async ({ input }) => {
      return refreshExchangeRate(input.baseCurrency, input.quoteCurrency, input.date);
    }),
});

export type ExchangeRateRouter = typeof exchangeRateRouter;
