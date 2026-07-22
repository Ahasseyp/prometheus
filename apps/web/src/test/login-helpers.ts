import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { server } from './server.js';

export async function fillLoginForm(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string
) {
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/^Password$/i), password);
}

export function mockLoginResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/auth.login', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockLoginError() {
  server.use(http.post('/api/trpc/auth.login', () => HttpResponse.error()));
}

export function mockMeResponse(user: unknown) {
  server.use(
    http.get('/api/trpc/auth.me', () => {
      return HttpResponse.json({ result: { data: user } });
    })
  );
}

export function mockLogoutResponse() {
  server.use(
    http.post('/api/trpc/auth.logout', () => {
      return HttpResponse.json({ result: { data: { ok: true } } });
    })
  );
}
