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

export function getHouseholdId(
  ctx: { user: { household: { id: string } | null } },
  feature: string
): string {
  if (ctx.user.household === null) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `Create a household before managing ${feature}.`,
    });
  }
  return ctx.user.household.id;
}

type ServiceErrorMapping = {
  code: 'NOT_FOUND' | 'PRECONDITION_FAILED' | 'BAD_REQUEST';
  message: string;
};

/**
 * Translates a service-layer error code into a TRPCError using the router's
 * mapping table and throws it. An unmapped code surfaces as
 * INTERNAL_SERVER_ERROR so a missed mapping is visible rather than silent.
 */
export function throwServiceError(
  error: string,
  mappings: Record<string, ServiceErrorMapping>
): never {
  const mapping = mappings[error];
  if (mapping === undefined) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
  }
  throw new TRPCError({ code: mapping.code, message: mapping.message });
}

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
