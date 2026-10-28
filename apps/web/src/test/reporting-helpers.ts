import { http, HttpResponse } from 'msw';

import { server } from './server.js';

export function mockReportingSummaryResponse(data: unknown) {
  server.use(
    http.get('/api/trpc/reporting.summary', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}
