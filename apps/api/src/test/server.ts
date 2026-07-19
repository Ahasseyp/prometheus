import type { Server } from 'http';

import { createApp } from '../server.js';
import { disconnectPrisma, getPrisma } from '../prisma.js';

export async function startTestServer() {
  const app = createApp();
  return new Promise<{ server: Server; url: string }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      resolve({ server, url: `http://localhost:${port}` });
    });
  });
}

export function makeTestEmail(localPart: string): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${localPart}-${suffix}@example.com`;
}

export async function cleanupTestData({
  userIds,
  householdIds,
}: {
  userIds: string[];
  householdIds?: string[];
}): Promise<void> {
  const prisma = getPrisma();
  await prisma.session.deleteMany({
    where: { userId: { in: userIds } },
  });
  if (householdIds !== undefined && householdIds.length > 0) {
    await prisma.household.deleteMany({
      where: { id: { in: householdIds } },
    });
  }
  await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  });
  await disconnectPrisma();
}
