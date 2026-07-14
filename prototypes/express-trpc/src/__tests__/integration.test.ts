import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../router.js";
import { createApp } from "../server.js";
import { PrismaClient } from "@prisma/client";
import type { Server } from "http";

const prisma = new PrismaClient();

async function startTestServer() {
  const app = createApp();
  return new Promise<{ server: Server; url: string }>((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, url: `http://localhost:${port}` });
    });
  });
}

describe("POST /trpc transaction.create", () => {
  let server: Server;
  let client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;

  beforeEach(async () => {
    await prisma.transaction.deleteMany();
    const { server: s, url } = await startTestServer();
    server = s;
    client = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${url}/trpc`,
        }),
      ],
    });
  });

  afterEach(async () => {
    server.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a transaction and returns it", async () => {
    const tx = await client.transaction.create.mutate({
      description: "Salary",
      amount: "5000.0000",
      currency: "USD",
    });

    expect(tx.description).toBe("Salary");
    expect(tx.amount).toBe("5000.0000");
    expect(tx.currency).toBe("USD");

    const rows = await prisma.transaction.findMany();
    expect(rows).toHaveLength(1);
  });

  it("throws a typed error for invalid input", async () => {
    await expect(
      client.transaction.create.mutate({
        description: "",
        amount: "not-money",
        currency: "Pesos",
      })
    ).rejects.toThrow();
  });
});
