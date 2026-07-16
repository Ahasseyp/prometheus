import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { z } from 'zod';
import { appRouter } from './router.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const portSchema = z.coerce.number().int().min(1).max(65535).default(3000);

function resolveWebDist(): string {
  return path.resolve(__dirname, '../../../apps/web/dist');
}

export function createApp(): express.Express {
  const app = express();
  const webDistPath = resolveWebDist();

  app.use(
    '/api/trpc',
    createExpressMiddleware({
      router: appRouter,
    })
  );

  app.use(express.static(webDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(webDistPath, 'index.html'));
  });

  return app;
}

const isMainModule = import.meta.url === new URL(process.argv[1], 'file://').href;

if (isMainModule) {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

  const port = portSchema.parse(process.env.PORT);
  const app = createApp();
  app.listen(port, () => {
    console.log(`API server ready at http://localhost:${port}`);
  });
}
