import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import argon2 from 'argon2';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { getPrisma } from './prisma.js';
import { createCookieJarFetch } from './test/cookies.js';
import { cleanupTestData, makeTestEmail, startTestServer } from './test/server.js';

describe.sequential('authentication procedures', () => {
  let server: Server;
  let serverUrl: string;
  let client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  let fetchWithCookies: ReturnType<typeof createCookieJarFetch>;
  const createdUserIds: string[] = [];
  let originalAllowInsecureCookies: string | undefined;

  beforeAll(async () => {
    originalAllowInsecureCookies = process.env.ALLOW_INSECURE_COOKIES;
    process.env.ALLOW_INSECURE_COOKIES = 'true';
    const { server: s, url } = await startTestServer();
    server = s;
    serverUrl = url;
    fetchWithCookies = createCookieJarFetch();
    client = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${url}/api/trpc`,
          fetch: fetchWithCookies,
        }),
      ],
    });
  });

  afterAll(async () => {
    if (originalAllowInsecureCookies === undefined) {
      delete process.env.ALLOW_INSECURE_COOKIES;
    } else {
      process.env.ALLOW_INSECURE_COOKIES = originalAllowInsecureCookies;
    }
    await cleanupTestData({ userIds: createdUserIds });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  });

  async function createUser(email: string, password: string) {
    const prisma = getPrisma();
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  it('logs in a user with valid credentials and returns safe fields', async () => {
    const email = makeTestEmail('login-test-1');
    const password = 'Secure-password-1';
    await createUser(email, password);

    const response = await client.auth.login.mutate({ email, password });

    expect(response.ok).toBe(true);
    if (!response.ok) return;

    expect(response.user.email).toBe(email.toLowerCase());
    expect(response.user.id).toBeDefined();
    expect(response.user).not.toHaveProperty('passwordHash');

    const [setCookie] = fetchWithCookies.getLastSetCookies();
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(setCookie).not.toMatch(/Secure/i);
  });

  it('rejects login with an incorrect password', async () => {
    const email = makeTestEmail('login-test-2');
    const password = 'Secure-password-2';
    await createUser(email, password);

    const response = await client.auth.login.mutate({
      email,
      password: 'Wrong-password-2',
    });

    expect(response).toEqual({ ok: false, error: 'invalid-credentials' });
  });

  it('rejects login for an unknown email', async () => {
    const response = await client.auth.login.mutate({
      email: makeTestEmail('login-test-unknown'),
      password: 'Secure-password-3',
    });

    expect(response).toEqual({ ok: false, error: 'invalid-credentials' });
  });

  it('returns the authenticated user from me when a valid session cookie is sent', async () => {
    const email = makeTestEmail('login-test-3');
    const password = 'Secure-password-3';
    await createUser(email, password);

    const loginResponse = await client.auth.login.mutate({ email, password });
    expect(loginResponse.ok).toBe(true);
    if (!loginResponse.ok) return;

    const meResponse = await client.auth.me.query();

    expect(meResponse.id).toBe(loginResponse.user.id);
    expect(meResponse.email).toBe(email.toLowerCase());
    expect(meResponse).not.toHaveProperty('passwordHash');
  });

  it('rejects me for unauthenticated requests', async () => {
    const freshClient = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${serverUrl}/api/trpc`,
          fetch: createCookieJarFetch(),
        }),
      ],
    });

    await expect(freshClient.auth.me.query()).rejects.toThrow();
  });

  it('logs out, clears the cookie, and invalidates the session', async () => {
    const email = makeTestEmail('login-test-4');
    const password = 'Secure-password-4';
    await createUser(email, password);

    const loginResponse = await client.auth.login.mutate({ email, password });
    expect(loginResponse.ok).toBe(true);
    if (!loginResponse.ok) return;

    const logoutResponse = await client.auth.logout.mutate();
    expect(logoutResponse.ok).toBe(true);

    const [setCookie] = fetchWithCookies.getLastSetCookies();
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(setCookie).not.toMatch(/Secure/i);
    expect(setCookie).toMatch(/Max-Age=0/i);

    await expect(client.auth.me.query()).rejects.toThrow();
  });
});
