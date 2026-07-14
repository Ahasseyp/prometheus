# Research: AI integration architecture and model providers

**Ticket:** #2 (blocks #12)  
**Map:** #1  
**Date:** 2026-07-13  
**Scope:** Choose an AI architecture and model provider(s) for voice/text data entry, natural-language queries, insights, and action commands in a mobile-first, multi-currency personal finance tracker.

---

## 1. Executive summary

For v1, the recommended path is **Vercel AI SDK Core + OpenAI GPT-5.4-mini/Anthropic Claude Haiku 4.5** for fast, cheap structured extraction, and **Claude Sonnet 5 or GPT-5.6** for complex insights and multi-step commands. Start with **direct LLM calls + tool calling** rather than a full agent framework; introduce a lightweight agent loop only when multi-turn reasoning is needed. All financial data should flow through a self-hosted backend, not the browser, and both OpenAI and Anthropic offer privacy controls that are acceptable for a public finance product.

Key constraints from the map:

- Mobile-first, Vite + React + Tailwind + shadcn/ui.
- Self-hosted backend, public product from day one.
- USD income + MXN expenses, multi-currency from v1.
- Voice input handled by a separate STT service (separate ticket #5).
- Manual data entry in v1; bank aggregation later.

---

## 2. AI architecture options

### 2.1 Direct LLM calls (recommended starting point)

**What it is:** Your backend calls the provider’s HTTP API directly or through the provider’s SDK (`openai`, `@anthropic-ai/sdk`). You own the conversation history, tool loop, retries, and parsing.

**Pros:**

- Lowest abstraction overhead and fewest dependencies.
- Full control over prompts, token budgets, and latency-sensitive paths.
- Easy to optimize per use case (e.g., small model for extraction, large model for insights).

**Cons:**

- You must write the tool-calling loop, error handling, and structured-output parsing.
- Switching providers requires code changes unless you abstract the client.

**Best for:** v1 where the AI surface is four well-defined roles (data entry, NL queries, insights, action commands) and most calls are single-turn with structured output.

### 2.2 Vercel AI SDK (recommended abstraction layer)

**What it is:** A TypeScript toolkit that standardizes text generation, structured output, tool calling, and streaming across many providers. It has three surfaces: AI SDK Core (server), AI SDK UI (React hooks), and AI SDK Harnesses (for Claude Code/Codex-style agents).[\[1\]](https://sdk.vercel.ai/docs/introduction)

**Pros:**

- Unified provider interface; swapping OpenAI ↔ Anthropic ↔ Groq is mostly a model string change.[\[1\]](https://sdk.vercel.ai/docs/introduction)
- Native Zod schemas for structured output, streaming, and tool calling.[\[2\]](https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data)
- First-class React/Vite integration through `useObject`, `useChat`, etc., which fits the frontend stack.
- Supports 20+ providers including OpenAI, Anthropic, Groq, Google, Ollama, and OpenAI-compatible local endpoints.[\[3\]](https://sdk.vercel.ai/docs/foundations/providers-and-models)

**Cons:**

- Adds a dependency and a learning curve.
- Some provider-specific features are not exposed.

**Best for:** This project. It gives the team portability across providers while keeping the backend simple. AI SDK Core can run in a Node/Edge backend; the frontend uses AI SDK UI hooks for streaming chat/insight objects.

### 2.3 LangChain

**What it is:** An orchestration and abstraction framework. LangChain now exposes `create_agent` as a minimal, configurable agent harness, with LangGraph underneath for durable workflows and LangSmith for tracing.[\[4\]](https://js.langchain.com/docs/introduction/)

**Pros:**

- Mature ecosystem, many integrations, and built-in memory/RAG/tool patterns.
- Good if you need complex multi-agent workflows, durable execution, or human-in-the-loop approvals.
- Supports OpenAI, Anthropic, Google, Ollama, and many others through provider packages.[\[4\]](https://js.langchain.com/docs/introduction/)

**Cons:**

- Heavier than Vercel AI SDK; historically criticized for opaque abstractions.
- More moving parts for a v1 where the scope is bounded.

**Best for:** Defer until the product needs durable agent workflows, long-context memory, or evaluation pipelines. Not the fastest path to v1.

### 2.4 OpenAI Agents SDK

**What it is:** OpenAI’s official agent framework that runs the agent loop for you, with built-in sessions, handoffs, guardrails, and tracing.[\[5\]](https://platform.openai.com/docs/guides/agents)

**Pros:**

- Tight integration with OpenAI models and tools.
- Good for multi-step, multi-agent workflows.

**Cons:**

- Tightly coupled to OpenAI; less portable than Vercel AI SDK.
- Adds complexity that is not needed for v1.

**Best for:** Later, if the product becomes deeply agentic and OpenAI is the chosen provider.

### 2.5 Recommendation: layered architecture

```
┌─────────────────────────────────────┐
│ Frontend (React + shadcn/ui)          │
│ useChat / useObject from AI SDK UI    │
└──────────────┬──────────────────────┘
               │ HTTP / SSE
┌──────────────▼──────────────────────┐
│ Self-hosted backend (Node/Edge)       │
│ AI SDK Core + provider switch         │
│ Tool definitions for finance actions  │
│ Structured-output schemas (Zod)         │
└──────────────┬──────────────────────┘
               │ API calls
┌──────────────▼──────────────────────┐
│ LLM provider (OpenAI / Anthropic)   │
└─────────────────────────────────────┘
```

Use **Vercel AI SDK Core** as the unified abstraction, but keep each AI role as a mostly direct, single-turn call. Add a lightweight loop only for multi-tool commands (e.g., “move $500 from savings to vacation budget and create a recurring reminder”). This keeps the architecture portable, low-latency, and easy to test.

---

## 3. Model provider comparison

### 3.1 OpenAI

**Current models (as of 2026-07-13):**

| Model | Input / MTok | Output / MTok | Role fit |
|-------|--------------|---------------|----------|
| GPT-5.6-sol | $5.00 / $10.00 long | $30.00 / $45.00 long | Complex insights, reasoning |
| GPT-5.6-terra | $2.50 / $5.00 long | $15.00 / $22.50 long | General insights, query parsing |
| GPT-5.6-luna | $1.00 / $2.00 long | $6.00 / $9.00 long | Fast general-purpose |
| GPT-5.5 | $5.00 / $10.00 long | $30.00 / $45.00 long | Reasoning, coding |
| GPT-5.4 | $2.50 / $5.00 long | $15.00 / $22.50 long | Balanced quality/speed |
| **GPT-5.4-mini** | **$0.75** | **$4.50** | **Structured data entry (recommended)** |
| **GPT-5.4-nano** | **$0.20** | **$1.25** | **Ultra-cheap classification/extraction** |

Pricing source: OpenAI API pricing page, standard tier, short context unless noted.[\[6\]](https://platform.openai.com/docs/pricing)

**Strengths:**

- **Structured outputs:** Native JSON Schema strict mode with guaranteed schema adherence; SDK supports Zod and Pydantic helpers.[\[7\]](https://platform.openai.com/docs/guides/structured-outputs)
- **Function calling:** Mature, supports namespaces, tool search, and parallel tool calls. Recommended for tool use; structured `response_format` for direct user-facing output.[\[8\]](https://platform.openai.com/docs/guides/function-calling)
- **Latency:** Offers Priority processing and Flex processing tiers for predictable latency/cost tradeoffs.[\[6\]](https://platform.openai.com/docs/pricing)
- **Privacy:** API data is not used to train models by default (since March 1, 2023). Zero Data Retention (ZDR) and Modified Abuse Monitoring are available by approval. Data residency endpoints exist for US, EU, Australia, Canada, etc., with a 10% uplift for eligible models released on or after March 5, 2026.[\[9\]](https://platform.openai.com/docs/guides/your-data)

**Weaknesses:**

- Premium models are expensive for high-volume extraction.
- Responses API stores application state for 30 days by default unless `store=false` or ZDR is enabled.[\[9\]](https://platform.openai.com/docs/guides/your-data)

### 3.2 Anthropic

**Current models (as of 2026-07-13):**

| Model | Input / MTok | Output / MTok | Role fit |
|-------|--------------|---------------|----------|
| Claude Fable 5 | $10.00 | $50.00 | Long-running agents |
| Claude Opus 4.8 | $5.00 | $25.00 | Complex reasoning, coding |
| **Claude Sonnet 5** | **$2.00** ($3.00 after Aug 31 2026) | **$10.00** ($15.00 after Aug 31 2026) | **Best quality/speed balance (recommended)** |
| Claude Haiku 4.5 | $1.00 | $5.00 | Fast extraction, classification |
| Claude Sonnet 4.6 | $3.00 | $15.00 | Reliable workhorse |

Pricing source: Anthropic pricing page.[\[10\]](https://www.anthropic.com/pricing)

**Strengths:**

- **Structured outputs:** `output_config.format` with JSON Schema and `strict: true` for tool use; SDK supports Zod/Pydantic helpers. Available across Sonnet/Opus/Haiku families.[\[11\]](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- **Tool use:** Well-documented round-trip model, parallel tool calls, and strict tool use for schema conformance.[\[12\]](https://platform.claude.com/docs/en/build-with-claude/tool-use)
- **Latency:** Fast mode available for Opus 4.8 at 2x standard pricing. Prompt caching with 5-minute TTL (extended options available).[\[10\]](https://www.anthropic.com/pricing)
- **Privacy:** API data is not used for model training without express permission. ZDR is available by contacting sales. HIPAA readiness is self-serve for eligible orgs. Structured outputs qualify for ZDR with limited technical retention (JSON schema cached up to 24 hours).[\[13\]](https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention)

**Weaknesses:**

- Fable 5 and Mythos 5 are designated “Covered Models” and require 30-day data retention, so they are not ZDR-eligible.[\[13\]](https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention)
- Sonnet 5 pricing is introductory until August 31, 2026.

### 3.3 Other providers

| Provider | Key facts | Best fit |
|----------|-----------|----------|
| **Groq** | Extremely fast inference (e.g., Llama 3.1 8B at 840 TPS, $0.05 input / $0.08 output per MTok).[\[14\]](https://groq.com/pricing) | Low-latency, cost-sensitive classification or simple extraction. Quality may lag behind OpenAI/Anthropic for nuanced finance reasoning. |
| **Google Gemini** | Competitive pricing and long context, but official pricing page was unreachable during this research. | Consider if Gemini API pricing proves materially lower; verify structured-output support and data residency before use. |
| **Self-hosted (Ollama, etc.)** | Maximum privacy; can run Llama 3.x, Qwen, Phi, etc. Requires GPU for acceptable latency/quality. | Optional “offline mode” for paranoid users; not a viable default for a public, multi-tenant v1. |
| **Vercel AI Gateway** | Routes traffic across providers and adds caching/rate limiting. | Useful later for multi-provider failover and cost optimization. |

### 3.4 Provider recommendation matrix

| Use case | Recommended model | Why |
|----------|-----------------|-----|
| Structured data entry (voice→transaction) | OpenAI GPT-5.4-mini or Anthropic Claude Haiku 4.5 | Fast, cheap, strong structured-output conformance. |
| NL query parsing (e.g., “how much did I spend on groceries last month?”) | Claude Sonnet 5 or GPT-5.6-luna | Good instruction following and date/entity extraction. |
| Insights & summaries | Claude Sonnet 5 or GPT-5.6-terra | Higher reasoning quality, worth the cost for low-frequency insights. |
| Complex action commands (multi-tool, budget changes) | Claude Sonnet 5 or GPT-5.6 | Best tool-use reliability and reasoning. |
| Prototyping / fallback / ultra-cheap | GPT-5.4-nano or Groq Llama 3.1 8B | Minimize cost while validating the product. |

---

## 4. Evaluation against project criteria

### 4.1 Latency

- **Data entry** must feel instant. Use small models (GPT-5.4-mini, Haiku 4.5, Groq Llama 3.1 8B) and streamed responses where possible. Vercel AI SDK’s `streamText` with `partialOutputStream` helps render structured objects as they arrive.[\[2\]](https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data)
- **NL queries** should target <1–2 s end-to-end. Sonnet 5 / GPT-5.6-luna are generally fast enough.
- **Insights** can tolerate 2–5 s because they are not blocking a real-time input flow.

### 4.2 Cost

For a typical finance app call:

- Input: ~500–2,000 tokens of system prompt + user context + schema.
- Output: ~200–500 tokens of structured JSON or short insight.

At 1,000 calls/day:

- GPT-5.4-mini: ~$1–$3/day.
- Haiku 4.5: ~$2–$7/day.
- Sonnet 5: ~$6–$20/day.
- Groq Llama 3.1 8B: ~$0.10–$0.30/day (but may need retries for quality).

**Strategy:** Use the cheapest model that reliably passes evals for each role; reserve expensive models for hard queries and insights.

### 4.3 Structured-output quality

Both OpenAI and Anthropic provide **constrained decoding** (JSON Schema strict mode) that guarantees valid JSON and schema adherence. This is critical for finance actions because a malformed tool call could corrupt a transaction.

- OpenAI recommends structured outputs via function calling for tools and via `response_format`/`text.format` for user-facing output.[\[7\]](https://platform.openai.com/docs/guides/structured-outputs)
- Anthropic supports `output_config.format` and `strict: true` on tools; JSON schema is cached separately for up to 24 hours.[\[11\]](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)[\[13\]](https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention)

Both are production-ready. OpenAI’s strict mode has been in market longer; Anthropic’s is now GA across the recommended models.

### 4.4 Privacy and financial data

Because this is a public finance app, the following controls are required:

1. **Never send financial data from the browser.** The mobile app should stream voice to the self-hosted backend, which runs STT and LLM calls. This keeps API keys and raw transaction data off client devices.
2. **Do not train on API data.** Both OpenAI and Anthropic commit to this by default for API usage.[\[9\]](https://platform.openai.com/docs/guides/your-data)[\[13\]](https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention)
3. **Apply for Zero Data Retention** once the product has traction or handles sensitive regulated data. OpenAI requires sales approval; Anthropic requires contacting sales. Both offer ZDR for the core chat/completion endpoints.
4. **Data residency:** OpenAI supports regional endpoints (US, EU, etc.) for storage and processing; Anthropic offers data residency for `/v1/messages` with `inference_geo`.[\[9\]](https://platform.openai.com/docs/guides/your-data)[\[13\]](https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention)
5. **Schema hygiene:** Do not embed PII or account numbers in JSON schemas. Keep schemas generic (e.g., `amount`, `currency`, `category`) and pass values in message content, where retention protections apply.
6. **Consider an on-premise/open-weight fallback:** For users who refuse cloud LLMs, a self-hosted option (Ollama with Llama 3.3 or Qwen3) can be offered later, but quality and latency will degrade.

---

## 5. Proposed v1 architecture

```text
Mobile client (React + Vite + shadcn/ui)
  └── Voice/text input → backend API

Self-hosted backend (Node.js / Edge)
  └── AI SDK Core
      ├── Role router
      │   ├── data-entry → small model + transaction schema
      │   ├── query-parser → medium model + query intent schema
      │   ├── insights → large model + insight/markdown schema
      │   └── action-commands → medium/large model + tool calls
      └── Finance tool definitions (Zod)
          ├── createTransaction
          ├── updateBudget
          ├── runReport
          └── scheduleReminder

Provider layer
  ├── Primary: OpenAI GPT-5.4-mini / Anthropic Claude Haiku 4.5
  ├── Insights: Claude Sonnet 5 / GPT-5.6-luna
  └── Optional: Groq for high-volume, low-complexity calls
```

Reasoning:

- Vercel AI SDK gives a single, typed API for structured output and tool calling across providers.
- Direct single-turn calls cover the four AI roles without needing an agent loop.
- A role-based router lets the team optimize cost/latency per task from day one.
- Zod schemas enforce the command taxonomy and make downstream parsing safe.

---

## 6. Open questions / next steps

- **Decision needed:** Single primary provider (OpenAI or Anthropic) or dual-provider strategy? A dual-provider strategy adds resilience but doubles integration/testing surface.
- **Evals:** Define a benchmark dataset of finance utterances in English and Spanish (Mexican market) to compare extraction accuracy and latency across models.
- **Tool taxonomy:** #13 (“AI command taxonomy and interaction patterns”) needs to define the exact tool schemas before implementation.
- **Security model:** #12 (“Security and privacy model for cloud AI and self-hosted data”) should formalize data residency, ZDR, and PII handling.
- **STT integration:** Voice input will be handled by a separate STT service (#5). Latency of the end-to-end pipeline depends on that choice.
- **Token caching:** For repeated system prompts (transaction schema, user context), use prompt caching on both OpenAI and Anthropic to reduce latency and cost.

---

## 7. Sources

1. Vercel AI SDK introduction — https://sdk.vercel.ai/docs/introduction
2. Vercel AI SDK Core: Generating structured data — https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data
3. Vercel AI SDK: Providers and models — https://sdk.vercel.ai/docs/foundations/providers-and-models
4. LangChain overview — https://js.langchain.com/docs/introduction/
5. OpenAI Agents SDK — https://platform.openai.com/docs/guides/agents
6. OpenAI API pricing — https://platform.openai.com/docs/pricing
7. OpenAI structured outputs — https://platform.openai.com/docs/guides/structured-outputs
8. OpenAI function calling — https://platform.openai.com/docs/guides/function-calling
9. OpenAI data controls / your data — https://platform.openai.com/docs/guides/your-data
10. Anthropic pricing — https://www.anthropic.com/pricing
11. Anthropic structured outputs — https://platform.claude.com/docs/en/build-with-claude/structured-outputs
12. Anthropic tool use — https://platform.claude.com/docs/en/build-with-claude/tool-use
13. Anthropic API and data retention — https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention
14. Groq pricing — https://groq.com/pricing
