import { parse as parseCookie } from 'cookie';

export function createCookieJarFetch() {
  const cookieJar = new Map<string, string>();
  const lastSetCookies: string[] = [];

  async function fetchWithCookies(
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> {
    const url = input.toString();
    const cookieHeader = Array.from(cookieJar.values()).join('; ');

    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      credentials: 'include',
    });

    lastSetCookies.length = 0;
    const setCookies = response.headers.getSetCookie();
    lastSetCookies.push(...setCookies);

    for (const setCookie of setCookies) {
      const parsed = parseCookie(setCookie);
      for (const [name, value] of Object.entries(parsed)) {
        if (value === '' || /Max-Age=0/i.test(setCookie)) {
          cookieJar.delete(name);
        } else {
          cookieJar.set(name, `${name}=${value}`);
        }
      }
    }

    return response;
  }

  fetchWithCookies.getLastSetCookies = () => lastSetCookies;

  return fetchWithCookies;
}
