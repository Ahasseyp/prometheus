import { createTRPCProxyClient, httpLink } from '@trpc/client';
import type { AppRouter } from '@prometheus/api/router';

const API_URL = import.meta.env.VITE_API_URL ?? '/api/trpc';

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpLink({
      url: API_URL,
    }),
  ],
});
