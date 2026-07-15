import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (prisma === undefined) {
    prisma = new PrismaClient();
  }
  return prisma;
}
