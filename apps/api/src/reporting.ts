import { z } from 'zod';
import { AccountType } from '@prometheus/domain';

import { getReportingSummary } from './services/reporting.js';
import { getHouseholdId, protectedProcedure, router } from './trpc.js';

const reportingAccountSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AccountType),
  currency: z.string(),
  balance: z.string(),
  convertedBalance: z.string().nullable(),
  exchangeRate: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const reportingSummarySchema = z.object({
  reportingCurrency: z.string(),
  netWorth: z.string().nullable(),
  accounts: z.array(reportingAccountSchema),
});

export const reportingRouter = router({
  summary: protectedProcedure.output(reportingSummarySchema).query(async ({ ctx }) => {
    const householdId = getHouseholdId(ctx, 'reporting');
    return getReportingSummary(householdId);
  }),
});

export type ReportingRouter = typeof reportingRouter;
