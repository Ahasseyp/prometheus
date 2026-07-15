import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { z } from 'zod';
import { appRouter } from './router.js';

const portSchema = z.coerce.number().int().min(1).max(65535).default(3000);

export function createApp(): express.Express {
  const app = express();

  app.use(
    '/api/trpc',
    createExpressMiddleware({
      router: appRouter,
    })
  );

  return app;
}

const isMainModule = import.meta.url === new URL(process.argv[1], 'file://').href;

if (isMainModule) {
  const port = portSchema.parse(process.env.PORT);
  const app = createApp();
  app.listen(port, () => {
    console.log(`API server ready at http://localhost:${port}`);
  });
}
