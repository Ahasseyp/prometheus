import '@testing-library/jest-dom/vitest';
import { beforeAll, afterAll, afterEach, vi } from 'vitest';

import { server } from './server.js';

beforeAll(() => {
  vi.stubGlobal('scrollTo', vi.fn());
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
