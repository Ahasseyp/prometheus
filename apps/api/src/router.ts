import { z } from 'zod';
import { getPrisma } from './prisma.js';
import { publicProcedure, router } from './trpc.js';
import { accountRouter } from './account.js';
import { authRouter } from './auth.js';
import { categoryRouter } from './category.js';
import { exchangeRateRouter } from './exchange-rate.js';
import { householdRouter } from './household.js';
import { registrationRouter } from './registration.js';
import { reportingRouter } from './reporting.js';
import { transactionRouter } from './transaction.js';
import { transferRouter } from './transfer.js';

export const appRouter = router({
  // Verifies both that the server is up and that PostgreSQL is reachable.
  // A failing database connection is treated as an exceptional state and is
  // allowed to surface as an error response rather than a degraded payload.
  // See https://github.com/Ahasseyp/prometheus/issues/46.
  health: publicProcedure.output(z.object({ status: z.literal('ok') })).query(async () => {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }),

  account: accountRouter,
  auth: authRouter,
  category: categoryRouter,
  exchangeRate: exchangeRateRouter,
  household: householdRouter,
  registration: registrationRouter,
  reporting: reportingRouter,
  transaction: transactionRouter,
  transfer: transferRouter,
});

export type AppRouter = typeof appRouter;
