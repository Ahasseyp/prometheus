import { initTRPC } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function createContext({ req, res }: CreateExpressContextOptions) {
  return { prisma, req, res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
