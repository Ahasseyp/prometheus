import { initTRPC, TRPCError } from '@trpc/server';
import type { Response } from 'express';

import type { AuthenticatedUser } from './services/session.js';
import { findUserBySessionToken } from './services/session.js';

export type Context = {
  user: AuthenticatedUser | null;
  sessionToken: string | null;
  res: Response;
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.user === null) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export async function createContext({
  req,
  res,
}: {
  req: { cookies?: Record<string, string | undefined> };
  res: Response;
}): Promise<Context> {
  const token = req.cookies?.session_token ?? null;

  if (token === null) {
    return { user: null, sessionToken: null, res };
  }

  const user = await findUserBySessionToken(token);

  return {
    user,
    sessionToken: token,
    res,
  };
}
