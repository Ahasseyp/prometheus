import { createTRPCProxyClient, httpLink } from '@trpc/client';
import type { AppRouter } from '@prometheus/api/router';

// In dev the Vite proxy forwards /api to the backend, avoiding CORS.
// In production the Express server serves the app and mounts /api/trpc,
// so the same-origin relative URL works.
const TRPC_URL = '/api/trpc';

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpLink({
      url: TRPC_URL,
    }),
  ],
});
