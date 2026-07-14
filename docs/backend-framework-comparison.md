# Backend framework comparison for Prometheus

A focused comparison of **Express**, **Fastify**, and **Hono** for the Prometheus backend.
The goal is to choose a framework that is:

1. Battle-tested and easy to maintain for a non-backend expert.
2. A good fit for a self-hosted Node.js + TypeScript + Prisma API.
3. Easy to test and to wire with tRPC and Zod for end-to-end type safety.

## The short version

| | Express | Fastify | Hono |
|---|---|---|---|
| **Maturity** | 2010, OpenJS Foundation, extremely mature | 2016, OpenJS Foundation, mature and actively developed | 2022, newer, very active |
| **Battle-testedness** | Highest: largest community, most Stack Overflow answers, most tutorials, most hiring pool | High: large community, many production users, strong core team | Growing fast, but smaller ecosystem and fewer real-world examples |
| **Philosophy** | Minimalist: gives you a router + middleware, you wire the rest | Opinionated-but-light: plugins, hooks, built-in validation, fast defaults | Ultralight: Web Standards API, runs on Node, Deno, Bun, Workers |
| **Performance** | Good enough for almost everything | Faster than Express in benchmarks | Very fast, especially on edge runtimes |
| **TypeScript story** | Manual: you add types and validation yourself | Good built-in types; schema validation via JSON Schema or Zod | Good types; validation via Zod or native validators |
| **tRPC integration** | `@trpc/server/adapters/express` | `@trpc/server/adapters/fastify` | `@trpc/server/adapters/fetch` / community adapters |
| **Prisma integration** | Works with any approach | Works with any approach | Works with any approach |
| **Self-hosted VPS fit** | Excellent | Excellent | Good, but edge/serverless is its home turf |
| **When to choose** | You want the safest, most boring, most-googled choice | You want modern defaults + speed without NestJS ceremony | You want minimal surface area or may deploy to the edge later |

## Express

Express is the default choice for Node.js APIs. It has been around since 2010, is hosted by the OpenJS Foundation, and has the largest ecosystem by far.

**Pros**
- Maximum battle-testedness: if you hit a problem, someone has already answered it on Stack Overflow.
- Huge middleware ecosystem: auth, logging, CORS, parsing, etc. are one `npm install` away.
- Minimal core: easy to understand what the framework is doing.
- Great hiring and community knowledge: most Node developers have used Express.

**Cons**
- You assemble most things yourself: validation, structured logging, error handling, etc.
- No built-in schema validation; you wire Zod manually.
- Slower than Fastify in raw benchmarks (usually irrelevant until you have serious load).
- Callback-based history can make some middleware feel dated, though modern async/await works fine.

**Best for Prometheus if** you want the safest, least-surprising choice and do not mind writing a little more boilerplate.

## Fastify

Fastify was created in 2016 by Node.js core contributors and is also an OpenJS Foundation project. It is designed to be fast and low-overhead while still giving you a plugin architecture and good defaults.

**Pros**
- Built-in JSON Schema validation and very fast serialization.
- Plugin system keeps routes and features organized without NestJS-level abstraction.
- Structured logging via Pino out of the box.
- Strong TypeScript support and a large, growing ecosystem.
- tRPC and Prisma integrate cleanly.
- Faster than Express with comparable or better safety defaults.

**Cons**
- Smaller ecosystem than Express, though still large.
- Plugin/hook model has a small learning curve.
- Validation is JSON Schema by default; you may still prefer Zod for source-of-truth schemas.

**Best for Prometheus if** you want modern defaults, built-in validation/logging, and better performance than Express without the weight of NestJS.

## Hono

Hono is the newest of the three. It is built on Web Standards (`Request` / `Response`) and is designed to run on many runtimes: Node.js, Deno, Bun, Cloudflare Workers, Fastly, AWS Lambda, etc.

**Pros**
- Extremely small and fast.
- Clean, modern API.
- Web Standards base means skills transfer to other runtimes.
- Good built-in middleware (CORS, JWT, logger, etc.).

**Cons**
- Newest framework with the smallest ecosystem and community.
- Many tutorials, plugins, and debugging resources are still edge/serverless focused.
- Fewer production examples for traditional self-hosted Node.js + Prisma APIs.
- tRPC adapter is fetch-based and slightly less common than Express/Fastify adapters.
- When something breaks, you are more likely to be on your own.

**Best for Prometheus if** you value minimalism above all else or think you may later deploy to edge/serverless platforms. For a self-hosted VPS, it is a capable but less conventional choice.

## How the choice affects Prometheus

| Concern | Express | Fastify | Hono |
|---|---|---|---|
| **Testing** | Jest/Vitest + Supertest; very common pattern | Jest/Vitest + `inject()` helper or Supertest; also common | Vitest + `app.request('/path')`; lighter docs/community |
| **tRPC + Zod** | Mature adapter; you wire validation | Mature adapter; you wire validation | Fetch adapter; validation via Zod |
| **Prisma** | Standard `PrismaClient` usage | Standard `PrismaClient` usage | Standard `PrismaClient` usage |
| **Auth sessions** | Many middleware options | Many plugin options | Fewer options; you may write more yourself |
| **Deployment** | Boring Docker + Node.js | Boring Docker + Node.js | Boring Docker + Node.js, but edge is its strength |
| **Long-term maintenance** | Easiest to hire for and Google | Easy to hire for, growing fast | Smaller community, more risk for a non-expert |

## Recommendation

For a non-backend expert building a self-hosted TypeScript API, the order of preference is:

1. **Express** — if you want maximum battle-testedness and the easiest path to finding help.
2. **Fastify** — if you want modern defaults, built-in validation/logging, and better performance without NestJS.
3. **Hono** — only if you specifically want edge portability or the absolute smallest footprint.

Given Prometheus is self-hosted on a VPS, does not need edge deployment, and the maintainer is not a backend specialist, **Express is the safest default**. Fastify is the best upgrade if you want more built-in conventions. Hono is a reasonable curiosity but not the safest main choice.

## Sources

- Express: <https://expressjs.com/>
- Fastify: <https://fastify.dev/>
- Hono: <https://hono.dev/>
