import { http, HttpResponse } from 'msw';

import { server } from './server.js';

export function mockAssistantSubmitCommandResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/assistant.submitCommand', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockAssistantExecuteCommandResponse(data: unknown) {
  server.use(
    http.post('/api/trpc/assistant.executeCommand', () => {
      return HttpResponse.json({ result: { data } });
    })
  );
}

export function mockAssistantExecuteCommandError(message = 'Something went wrong.') {
  server.use(
    http.post('/api/trpc/assistant.executeCommand', () => {
      return HttpResponse.json(
        { error: { message, code: -32600, data: { code: 'BAD_REQUEST', httpStatus: 400 } } },
        { status: 400 }
      );
    })
  );
}
