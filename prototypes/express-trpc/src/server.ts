import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./router.js";
import { createContext } from "./trpc.js";

export function createApp() {
  const app = express();

  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  app.listen(port, () => {
    console.log(`Server ready at http://localhost:${port}`);
  });
}
