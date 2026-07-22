import { serialize } from 'cookie';
import { z } from 'zod';

export const SESSION_COOKIE_NAME = 'session_token';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const allowInsecureCookiesSchema = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

export function isInsecureCookiesAllowed(): boolean {
  return allowInsecureCookiesSchema.parse(process.env.ALLOW_INSECURE_COOKIES);
}

export function createSessionCookieValue(token: string, maxAge: number): string {
  return serialize(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: !isInsecureCookiesAllowed(),
    maxAge,
    path: '/',
  });
}
