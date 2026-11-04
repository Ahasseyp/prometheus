import { http, HttpResponse } from 'msw';

import { server } from './server.js';

export function mockAssistantSubmitCommandResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/assistant.submitCommand', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}
