import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { Server } from 'http';
import type { AppRouter } from './router.js';
import { disconnectPrisma, getPrisma } from './prisma.js';
import { createCookieJarFetch } from './test/cookies.js';
import { makeTestEmail, startTestServer } from './test/server.js';

function enableRegistration(): void {
  process.env.ALLOW_REGISTRATION = 'true';
}

function disableRegistration(): void {
  process.env.ALLOW_REGISTRATION = 'false';
}

describe.sequential('registration procedure', () => {
  let server: Server;
  let client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  let fetchWithCookies: ReturnType<typeof createCookieJarFetch>;
  const createdUserIds: string[] = [];
  let originalAllowRegistration: string | undefined;
  let originalAllowInsecureCookies: string | undefined;

  beforeAll(async () => {
    originalAllowRegistration = process.env.ALLOW_REGISTRATION;
    originalAllowInsecureCookies = process.env.ALLOW_INSECURE_COOKIES;
    process.env.ALLOW_INSECURE_COOKIES = 'true';
    const { server: s, url } = await startTestServer();
    server = s;
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
    if (originalAllowRegistration === undefined) {
      delete process.env.ALLOW_REGISTRATION;
    } else {
      process.env.ALLOW_REGISTRATION = originalAllowRegistration;
    }
    if (originalAllowInsecureCookies === undefined) {
      delete process.env.ALLOW_INSECURE_COOKIES;
    } else {
      process.env.ALLOW_INSECURE_COOKIES = originalAllowInsecureCookies;
    }
    const prisma = getPrisma();
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
    await disconnectPrisma();
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

  it('registers a new user, returns safe fields, and sets a session cookie', async () => {
    enableRegistration();
    const email = makeTestEmail('register-test-1');
    const response = await client.registration.register.mutate({
      email,
      password: 'Secure-password-1',
    });

    expect(response.ok).toBe(true);
    if (!response.ok) return;

    expect(response.user.email).toBe(email.toLowerCase());
    expect(response.user.id).toBeDefined();
    expect(response.user).not.toHaveProperty('passwordHash');

    createdUserIds.push(response.user.id);

    const [setCookie] = fetchWithCookies.getLastSetCookies();
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(setCookie).not.toMatch(/Secure/i);
  });

  it('authenticates the user immediately after registration', async () => {
    enableRegistration();
    const email = makeTestEmail('register-test-auth');
    const registerResponse = await client.registration.register.mutate({
      email,
      password: 'Secure-password-1',
    });

    expect(registerResponse.ok).toBe(true);
    if (!registerResponse.ok) return;

    createdUserIds.push(registerResponse.user.id);

    const meResponse = await client.auth.me.query();

    expect(meResponse.id).toBe(registerResponse.user.id);
    expect(meResponse.email).toBe(email.toLowerCase());
  });

  it('rejects registration when ALLOW_REGISTRATION is unset (defaults to false)', async () => {
    delete process.env.ALLOW_REGISTRATION;

    const response = await client.registration.register.mutate({
      email: makeTestEmail('register-test-2'),
      password: 'Secure-password-2',
    });

    expect(response).toEqual({ ok: false, error: 'registration-disabled' });
  });

  it('rejects registration when ALLOW_REGISTRATION is false', async () => {
    disableRegistration();

    const response = await client.registration.register.mutate({
      email: makeTestEmail('register-test-3'),
      password: 'Secure-password-3',
    });

    expect(response).toEqual({ ok: false, error: 'registration-disabled' });
  });

  it('rejects a duplicate email registration', async () => {
    enableRegistration();
    const email = makeTestEmail('register-test-4');
    const first = await client.registration.register.mutate({
      email,
      password: 'Secure-password-4',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    createdUserIds.push(first.user.id);

    const second = await client.registration.register.mutate({
      email: email.toUpperCase(),
      password: 'Another-password-4',
    });

    expect(second).toEqual({ ok: false, error: 'email-already-exists' });
  });

  it('rejects an invalid email', async () => {
    enableRegistration();
    await expect(
      client.registration.register.mutate({
        email: 'not-an-email',
        password: 'Secure-password-5',
      })
    ).rejects.toThrow();
  });

  it('rejects a weak password', async () => {
    enableRegistration();
    await expect(
      client.registration.register.mutate({
        email: makeTestEmail('register-test-6'),
        password: 'short',
      })
    ).rejects.toThrow();
  });
});
