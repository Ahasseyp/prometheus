import { http, HttpResponse } from 'msw';

import { server } from './server.js';

export function mockHouseholdMeResponse(data: unknown) {
  server.use(
    http.get('/api/trpc/household.me', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockCreateHouseholdResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/household.create', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockCreateHouseholdError() {
  server.use(http.post('/api/trpc/household.create', () => HttpResponse.error()));
}
