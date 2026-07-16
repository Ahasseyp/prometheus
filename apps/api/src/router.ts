import { z } from 'zod';
import { getPrisma } from './prisma.js';
import { publicProcedure, router } from './trpc.js';
import { registrationRouter } from './registration.js';

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

  registration: registrationRouter,
});

export type AppRouter = typeof appRouter;
