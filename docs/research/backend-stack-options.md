# Research: Self-hosted backend stack options

**Ticket:** #3 — Research: Self-hosted backend stack options  
**Map:** #1 — Map: Architecture for AI-first personal finance tracker/planner  
**Date:** 2026-07-13

## Executive recommendation

For the v1 self-hosted backend, **Node.js + TypeScript + NestJS + Prisma** is the strongest fit. It keeps the frontend (Vite + React + TypeScript) and backend in the same language and type system, gives a structured, extensible architecture for a public product, and has the richest first-party ecosystem for cloud-LLM integration. Local-first development can be satisfied with Node’s built-in `node:sqlite` module (or Prisma over SQLite) and a one-command Docker Compose setup for self-hosting with PostgreSQL.

**Runner-up:** Python + FastAPI + SQLModel/Pydantic if AI/ML workloads or numeric-precision requirements dominate the product definition.

## What we are optimizing for

| Criterion | Why it matters for this project |
|---|---|
| **Type safety** | Personal finance data is sensitive; contracts across mobile, web, and backend should be checked before runtime. |
| **Ecosystem** | Auth, ORM/migrations, multi-currency decimal handling, and LLM SDKs should be available and well-maintained. |
| **AI library integration** | The product is AI-first: data entry, NL queries, insights, action commands all call cloud LLM APIs. |
| **Deployment simplicity** | v1 is self-hosted by individual users; local-first dev and a single container (or compose) production deploy are required. |
| **Public-product extensibility** | The codebase should grow cleanly from single-user to multi-user/accounts and, later, multi-tenant. |

## Option profiles

### 1. Node.js / TypeScript — Express or NestJS

**Runtime & language**  
Node.js is the mature JavaScript server runtime [Node.js docs](https://nodejs.org/en/docs/). TypeScript adds static type checking; it is not enforced at runtime, but it catches contract errors at build time and enables excellent IDE support [TypeScript docs](https://www.typescriptlang.org/docs/).

**Express** is the minimal, unopinionated framework: thin layer over Node’s HTTP primitives, huge middleware ecosystem, but leaves architecture (folder structure, DI, testing) up to the team [Express](https://expressjs.com/).

**NestJS** adds the missing architecture: modules, dependency injection, decorators, built-in testing utilities, and OpenAPI generation. It runs on top of Express by default (Fastify optional) and is explicitly designed for scalable, loosely coupled server applications [nestjs/nest](https://github.com/nestjs/nest).

**Type safety** — TypeScript is the strongest here. Prisma ORM generates a type-safe client from a schema and supports PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, and CockroachDB [Prisma docs](https://www.prisma.io/docs/). For money, Prisma’s `Decimal` scalar maps to a fixed-point representation in the database and to a `Decimal` object in the generated client (backed by `decimal.js`); SQLite stores it as `DECIMAL` [Prisma schema reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#decimal).

**Local-first** — Node 22.5+ ships a built-in `node:sqlite` module (`import { DatabaseSync } from 'node:sqlite'`), which is enough for a file-backed local database during development [Node.js SQLite docs](https://nodejs.org/api/sqlite.html). In production/self-host, the same Prisma schema can target PostgreSQL via an environment variable.

**AI ecosystem** — This is the strongest option for cloud-LLM integration:
- The official OpenAI Node SDK is first-party, typed, and supports streaming, async, and the Responses API [openai-node](https://github.com/openai/openai-node).
- The Vercel AI SDK is a TypeScript-first toolkit for LLM providers, tool calling, structured output, streaming, and agent workflows [AI SDK docs](https://sdk.vercel.ai/docs/introduction).
- LangChain has a fully supported JavaScript/TypeScript implementation with agents and provider adapters [LangChain JS](https://js.langchain.com/docs/introduction/).

**Deployment** — Node containers are tiny and fast to build. Docker’s official guide shows a multi-stage Dockerfile for Express/TypeScript + PostgreSQL via Compose [Docker Node guide](https://docs.docker.com/language/nodejs/). One-click platforms also have first-class support: Render has a dedicated Express quickstart [Render Express](https://docs.render.com/deploy-node-express-app), and Railway supports Express via auto-detection, CLI, or Dockerfile [Railway Express](https://docs.railway.app/guides/express).

**When to choose** — Best when you want one language across the stack, strong typing, fast feature velocity, and the largest selection of LLM/AI SDKs.

---

### 2. Python — FastAPI or Django

**FastAPI** is a modern, async-friendly API framework built on Starlette and Pydantic. It uses standard Python type hints for request/response validation, dependency injection, and automatic OpenAPI/Swagger docs [FastAPI](https://fastapi.tiangolo.com/). TechEmpower benchmarks rank it as one of the fastest Python frameworks [FastAPI benchmarks](https://fastapi.tiangolo.com/benchmarks/).

**Django** is the “batteries included” option: built-in ORM, migrations, admin, auth, sessions, and security middleware [Django docs](https://docs.djangoproject.com/en/5.0/). For API-only builds, Rails-style API mode is available. **Django Ninja** layers FastAPI-style Pydantic typing and auto-docs on top of Django’s ORM and admin [Django Ninja](https://django-ninja.dev/).

**Type safety** — Python type hints are *not* enforced at runtime; they are checked by external tools such as mypy/pyright [Python typing docs](https://docs.python.org/3/library/typing.html). Pydantic closes the gap by validating and serializing data from types, with its core logic written in Rust [Pydantic docs](https://docs.pydantic.dev/latest/). SQLModel combines SQLAlchemy ORM with Pydantic models, which is the pattern used in Docker’s official FastAPI tutorial [Docker Python guide](https://docs.docker.com/language/python/).

**Numeric precision** — Python has a built-in `decimal` module designed for monetary/accounting arithmetic: exact decimal representation, configurable precision, and rounding modes [Python decimal docs](https://docs.python.org/3/library/decimal.html). This is a genuine advantage over JavaScript/TypeScript, where money must be handled with `Decimal` libraries or integer minor units.

**AI ecosystem** — Python is historically the center of ML/LLM tooling:
- Official OpenAI Python SDK, sync and async, Python 3.9+ [openai-python](https://github.com/openai/openai-python).
- LangChain Python, with the same agent/harness primitives and provider integrations [LangChain Python](https://python.langchain.com/docs/introduction/).

**Deployment** — FastAPI deploys simply with Uvicorn/Hypercorn in a container. Docker’s guide uses FastAPI + SQLModel + PostgreSQL in Compose [Docker Python guide](https://docs.docker.com/language/python/). Render and Railway both have dedicated FastAPI quickstarts [Render FastAPI](https://docs.render.com/deploy-fastapi), [Railway FastAPI](https://docs.railway.app/guides/fastapi).

**When to choose** — Best if you expect the backend to do heavy AI/ML orchestration, if you want the strongest built-in numeric-precision primitives, or if the team is already fluent in Python. The trade-off is a language/context-switch from the TypeScript frontend.

---

### 3. Ruby on Rails

Rails provides a full-stack, convention-over-configuration environment: Active Record ORM, migrations, built-in auth, admin, asset pipeline, background jobs, and an API-only mode [Rails Guides](https://guides.rubyonrails.org/). For a personal-finance app, many cross-cutting concerns (auth, sessions, CRUD, forms) are solved out of the box.

**Type safety** — Ruby is dynamically typed. Gradual typing is available via **RBS** (type-signature language) and **Sorbet** (static type checker), but adoption is not universal and it is not as deeply integrated as TypeScript or Rust [ruby/rbs](https://github.com/ruby/rbs), [Sorbet](https://sorbet.org/). This makes long-term refactoring and public API extensibility harder.

**AI ecosystem** — Ruby has fewer first-party LLM SDKs and framework integrations than Python or Node. Most cloud LLM APIs are usable via HTTP clients, but the ecosystem of typed SDKs, Vercel AI SDK equivalents, and LangChain ports is materially smaller.

**Deployment** — Rails deploys well with Docker, and services like Fly.io and Render have Rails templates. However, a Rails app carries more framework surface area than a focused API backend.

**When to choose** — Consider Rails if the team already knows it and wants rapid CRUD/auth/admin scaffolding. For an AI-first, mobile-first product with public-product extensibility, it is weaker on type safety and AI-library breadth.

---

### 4. Other options: Go and Rust

**Go** has a static type system, a fast compiler, and small binaries. The standard library’s `net/http` is sufficient for simple APIs, and frameworks like Gin or Echo add routing, middleware, and binding [Go web tutorial](https://go.dev/doc/articles/wiki/), [Gin](https://gin-gonic.com/), [Echo](https://echo.labstack.com/). The main downside is that the AI/LLM ecosystem (typed SDKs, agent frameworks, streaming helpers) is far smaller than Python/Node, so integration work would be higher.

**Rust** (Axum, Actix Web) offers memory safety and performance. Axum uses the Tower middleware ecosystem and has excellent type safety [axum docs](https://docs.rs/axum/latest/axum/); Actix Web is mature and async [Actix docs](https://actix.rs/docs/getting-started). Like Go, the LLM/AI library surface is thin compared with Node/Python, and compile times and hiring complexity are higher.

Both are excellent if raw performance or systems-level control becomes the dominant concern, but they are overkill for a self-hosted v1 focused on AI integration and developer velocity.

---

## Comparison matrix

| Dimension | Node/TS + NestJS | Python + FastAPI | Ruby on Rails | Go / Rust |
|---|---|---|---|---|
| **Language** | TypeScript (frontend-aligned) | Python | Ruby | Go / Rust |
| **Static type safety** | Strong (compile-time + Prisma types) | Moderate (type hints + Pydantic runtime) | Weak by default; RBS/Sorbet optional | Strong |
| **Framework architecture** | NestJS: modular, DI, testable | FastAPI: minimal, async; Django: batteries-included | Convention-heavy, full-stack | Minimal / modular |
| **ORM & migrations** | Prisma (multi-DB, typed) | SQLAlchemy/SQLModel/Django ORM | Active Record | sqlx/GORM / Diesel/SeaORM |
| **Money/decimal support** | `decimal.js` via Prisma Decimal | Native `decimal` module | `BigDecimal` gem | Libraries available |
| **AI/LLM ecosystem** | Best (OpenAI SDK, Vercel AI SDK, LangChain JS) | Excellent (OpenAI SDK, LangChain Python) | Smaller | Smaller |
| **Local-first dev** | `node:sqlite` built in; Prisma SQLite | SQLite + Python stdlib | SQLite supported | SQLite supported |
| **Deployment simplicity** | Very simple (Docker, Render, Railway) | Very simple (Docker, Render, Railway) | Moderate (more framework surface) | Simple but fewer templates |
| **Public-product extensibility** | Excellent (modules, OpenAPI, generated clients) | Good (OpenAPI, schemas) | Moderate (weaker typing) | Good but more boilerplate |

## Recommended v1 stack

```
Node.js 20+ LTS
TypeScript 5.x
NestJS 11.x
Prisma ORM 6.x
Database: SQLite (dev) / PostgreSQL (self-hosted production)
LLM/AI: Vercel AI SDK + official OpenAI SDK
Auth: NestJS Guards + a JWT/session library or oauth2-proxy for self-hosters
```

### Why this wins for the project

1. **Frontend/backend type unity** — The React frontend and NestJS backend can share TypeScript types, reducing contract bugs between the mobile/web client and the API.
2. **AI feature velocity** — Vercel AI SDK and the official OpenAI SDK give streaming, tool calling, structured outputs, and multi-provider switching with minimal code.
3. **Local-first, then self-hosted** — Use `node:sqlite` or Prisma with SQLite for zero-config local development; swap `DATABASE_URL` to PostgreSQL for the Dockerized self-hosted v1.
4. **Extensibility** — NestJS modules map cleanly to future domains (accounts, multi-tenancy, billing, AI agent service). Prisma migrations and OpenAPI generation keep the public API evolvable.
5. **Deployment simplicity** — A single `Dockerfile` and `compose.yaml` with the app + Postgres can be the self-host artifact; platform quickstarts exist if the project later offers a managed cloud option.

### If the team strongly prefers Python

Use **FastAPI + SQLModel + Pydantic**, containerized with PostgreSQL. This is particularly compelling if the AI layer will be doing heavy prompt engineering, agent orchestration, or custom model fine-tuning, because the Python ecosystem is the lingua franca there. Budget extra effort for frontend/backend type synchronization (e.g., generated OpenAPI client or duplicate schemas).

### What we should avoid for v1

- **Ruby on Rails** — weaker static typing and a smaller AI SDK ecosystem make it a slower fit for an AI-first, mobile-first product.
- **Go / Rust** — excellent for performance-critical services, but the lack of mature LLM/AI tooling and higher development friction make them poor choices for the first self-hosted version.

## References

- Node.js documentation: https://nodejs.org/en/docs/
- TypeScript documentation: https://www.typescriptlang.org/docs/
- Express: https://expressjs.com/
- NestJS: https://github.com/nestjs/nest
- Prisma ORM docs: https://www.prisma.io/docs/
- Prisma `Decimal` type reference: https://www.prisma.io/docs/orm/reference/prisma-schema-reference#decimal
- Node.js `node:sqlite` module: https://nodejs.org/api/sqlite.html
- OpenAI Node SDK: https://github.com/openai/openai-node
- Vercel AI SDK: https://sdk.vercel.ai/docs/introduction
- LangChain JS: https://js.langchain.com/docs/introduction/
- Docker Node.js guide: https://docs.docker.com/language/nodejs/
- Render Express deploy: https://docs.render.com/deploy-node-express-app
- Railway Express deploy: https://docs.railway.app/guides/express
- FastAPI: https://fastapi.tiangolo.com/
- Python `typing` module: https://docs.python.org/3/library/typing.html
- Pydantic docs: https://docs.pydantic.dev/latest/
- Python `decimal` module: https://docs.python.org/3/library/decimal.html
- Django docs: https://docs.djangoproject.com/en/5.0/
- Django Ninja: https://django-ninja.dev/
- OpenAI Python SDK: https://github.com/openai/openai-python
- LangChain Python: https://python.langchain.com/docs/introduction/
- Docker Python guide: https://docs.docker.com/language/python/
- Render FastAPI deploy: https://docs.render.com/deploy-fastapi
- Railway FastAPI deploy: https://docs.railway.app/guides/fastapi
- Ruby on Rails Guides: https://guides.rubyonrails.org/
- Ruby RBS: https://github.com/ruby/rbs
- Sorbet: https://sorbet.org/
- Go web tutorial: https://go.dev/doc/articles/wiki/
- Gin: https://gin-gonic.com/
- Echo: https://echo.labstack.com/
- Axum (Rust): https://docs.rs/axum/latest/axum/
- Actix Web: https://actix.rs/docs/getting-started
