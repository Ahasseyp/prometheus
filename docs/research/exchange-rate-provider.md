# Exchange-Rate Provider Research for Prometheus v1

**Issue:** [prometheus #15](https://github.com/Ahasseyp/prometheus/issues/15) — *Which exchange-rate provider should Prometheus use for v1 to convert between currencies (primarily USD and MXN), and how should it be integrated?*

**Research date:** 2026-07-14  
**Methodology:** All facts below were gathered from primary sources: official documentation, pricing pages, API references, status pages, and open-source repositories. No secondary summaries were used.

---

## 1. Open Exchange Rates

### MXN/USD coverage and accuracy
- Supports both **USD** and **MXN** among 200+ currencies[^oxr-currencies].
- Data sources are not fully listed, but the service advertises itself as a trusted commercial exchange-rate data API used by Shopify and others[^oxr-home].

### Pricing and limits
- **Free:** hourly updates, **1,000 requests/month**, **USD base only**[^oxr-pricing].
- **Developer:** $12/month — hourly updates, 10,000 requests/month, all base currencies[^oxr-pricing].
- **Enterprise:** $47/month — 30-minute updates, 100,000 requests/month, time-series endpoint[^oxr-pricing].
- **Unlimited:** $97/month — 5-minute updates, unlimited requests, conversion endpoint[^oxr-pricing].
- **VIP tiers:** live updates, bid/ask data, guaranteed uptime SLA, phone support[^oxr-pricing].

### Self-hosting constraints
- **SaaS only.** No self-hosted option is offered.

### API reliability and uptime
- Public status page reports **100% uptime over the past 90 days**[^oxr-status].
- No uptime SLA on free/Developer/Enterprise/Unlimited plans; SLA is only mentioned for VIP tiers[^oxr-pricing].

### Rate freshness
- Free plan: **hourly**. Paid plans: 30-minute, 5-minute, or live[^oxr-pricing].
- Daily freshness is more than met even on the free plan.

### Free tier for v1
- **1,000 requests/month** is plenty for daily updates (~30 requests/month).
- **Limitation:** free tier is locked to **USD as base currency**. If Prometheus households set their Reporting Currency to MXN, the free plan cannot fetch MXN-based rates directly[^oxr-pricing][^oxr-docs-base].

### Integration approach
- REST endpoint: `GET https://openexchangerates.org/api/latest.json?app_id={APP_ID}&base=USD&symbols=MXN`.
- Authentication via `app_id` query parameter.
- Response shape: `base`, `rates` map (e.g. `rates.MXN`), and `timestamp` (UNIX seconds)[^oxr-docs-latest].

---

## 2. ExchangeRate-API.com

### MXN/USD coverage and accuracy
- Supports **USD** and **MXN** among **165 currencies**[^era-currencies].
- Rates are **indicative midpoint rates** blended from 30+ central banks and commercial sources[^era-data].
- Not suitable for forex trading because bid/ask spreads are not provided[^era-data].

### Pricing and limits
- **Free:** daily updates, **1,500 requests/month**, any base currency, pair conversion, historical data, enriched data, email support, LTS commitment[^era-pricing].
- **Pro:** $10/month ($100/year) — hourly updates, 30,000 requests/month, enriched data, historical data, relaxed quota enforcement[^era-pricing].
- **Business:** $30/month ($300/year) — 5-minute updates, 125,000 requests/month[^era-pricing].
- **Volume:** $70/month ($700/year) — 5-minute updates, higher volume (exact call count not displayed on pricing page but mentioned in FAQ)[^era-pricing].
- Quotas are soft-capped; users get warnings at 75% and 100%[^era-standard].

### Self-hosting constraints
- **SaaS only.** No self-hosted option is offered.

### API reliability and uptime
- Hosted on **AWS multi-AZ** infrastructure behind **Cloudflare**[^era-uptime].
- Measured **>99.99% uptime in 2024** by Pingdom[^era-home].
- Public Pingdom status page: `http://stats.pingdom.com/qv69spvrz94m`[^era-status].

### Rate freshness
- Free plan: **once per 24 hours**.
- Pro: every 60 minutes.
- Business/Volume: every 5 minutes[^era-pricing][^era-data].
- Daily freshness is exactly what the free plan provides.

### Free tier for v1
- **1,500 requests/month** and **daily updates** are sufficient for v1.
- **Key advantage over OXR:** free tier allows **any base currency** and includes **pair conversion** and **historical data**[^era-pricing][^era-docs].

### Integration approach
- Standard endpoint: `GET https://v6.exchangerate-api.com/v6/{API_KEY}/latest/{BASE}`.
- Pair conversion endpoint: `GET https://v6.exchangerate-api.com/v6/{API_KEY}/pair/{FROM}/{TO}`.
- Authentication via path-based API key.
- Response includes `base_code`, `conversion_rates`, `time_last_update_unix`, `time_next_update_unix`, and `result` status[^era-standard].

---

## 3. Frankfurter.app

### MXN/USD coverage and accuracy
- Tracks **201 currencies** from **84 central banks and official sources**; both **USD** and **MXN** are listed[^frank-currencies][^frank-docs].
- **Banco de México (BANXICO)** is a first-class provider, publishing FIX rates for 6 currencies since 1991[^frank-banxico].
- v2 can retrieve a provider-specific USD/MXN rate: `GET https://api.frankfurter.dev/v2/rate/USD/MXN?providers=BANXICO`[^frank-banxico].
- v1 is ECB-derived; v2 defaults to blended rates across all providers. The docs note that for compliance you should filter by a specific provider, while blended rates are fine for general use[^frank-docs].

### Pricing and limits
- **Completely free.** No API key required.
- No monthly quotas; requests are only rate-limited to prevent abuse[^frank-docs].
- For high-volume use, caching, self-hosting, or direct dataset queries are recommended[^frank-docs].

### Self-hosting constraints
- **Official Docker image:** `lineofflight/frankfurter` (multi-platform `amd64`/`arm64`)[^frank-deploy].
- Default deployment uses an ephemeral SQLite database; production should mount a volume for persistence[^frank-deploy].
- Some optional providers require free API keys (e.g., BANXICO, FRED, TCMB); without them those providers are skipped[^frank-deploy][^frank-github].

### API reliability and uptime
- No formal SLA or dedicated status page found.
- Public API runs behind Cloudflare and is open-source, so the main risk-mitigation path is **self-hosting**[^frank-docs][^frank-deploy].

### Rate freshness
- **Daily.** v1 docs say latest working-day rates are updated around **16:00 CET**[^frank-v1].
- v2 also works on daily central-bank reference data.

### Free tier for v1
- Unlimited public use is more than enough for v1.
- No API key means no signup friction and no quota anxiety.

### Integration approach
- v2 (recommended): `GET https://api.frankfurter.dev/v2/rate/USD/MXN` or `GET https://api.frankfurter.dev/v2/rates?base=USD&quotes=MXN`.
- v1 (stable, superseded): `GET https://api.frankfurter.dev/v1/latest?base=USD&symbols=MXN`.
- No authentication needed.
- Response shape: `base`, `rates` map (v1) or `rate` scalar (v2)[^frank-docs][^frank-v1].

---

## 4. CurrencyFreaks

### MXN/USD coverage and accuracy
- Supports **USD** and **MXN** among **1,026 currencies** (fiat + cryptocurrencies + metals)[^cf-currencies][^cf-docs].
- Data source and methodology are not described in detail in the public docs.

### Pricing and limits
- **Developer (Free):** 1,000 requests/month, **24-hour updates**, **USD base only**, limited support, SSL[^cf-pricing].
- **Starter:** $9.99/month — 15,000 requests/month, hourly updates, all base currencies, historical data, conversion[^cf-pricing].
- **Growth:** $49.99/month — 150,000 requests/month, 10-minute updates, IP-to-currency endpoint[^cf-pricing].
- **Professional:** $99.99/month — 550,000 requests/month, 60-second updates, time-series and fluctuation endpoints[^cf-pricing].
- **Enterprise:** custom volume pricing[^cf-pricing].
- Hard monthly quotas; free tier gets one email at 100% usage[^cf-docs].

### Self-hosting constraints
- **SaaS only.** No self-hosted option is offered.

### API reliability and uptime
- Public status page reports **100% uptime over the last rolling month** and **99.85% in April 2026**[^cf-status].
- No explicit SLA in public docs.

### Rate freshness
- Free plan: **24-hour updates**.
- Paid plans: hourly, 10-minute, or 60-second[^cf-pricing].

### Free tier for v1
- **1,000 requests/month** is sufficient for daily updates.
- **Limitation:** free tier is **USD base only**. Base-currency change and conversion endpoints require a paid plan[^cf-pricing][^cf-docs].

### Integration approach
- Endpoint: `GET https://api.currencyfreaks.com/v2.0/rates/latest?apikey={KEY}&symbols=MXN&base=USD`.
- Authentication via `apikey` query parameter.
- Response includes `date`, `base`, and `rates` map[^cf-docs].

---

## 5. Other Candidates Considered

- **Fixer, Currencylayer, XE:** These were not evaluated in depth because their free tiers are either smaller, deprecated, or require a paid plan for base-currency flexibility. The four providers above already cover the v1 requirements.

---

## 6. Comparison Summary

| Provider | Free calls/month | Free update frequency | Free base currency | MXN/USD coverage | Self-hosting | Public uptime evidence |
|---|---|---|---|---|---|---|
| Open Exchange Rates | 1,000 | Hourly | USD only | Yes | No | 100% / 90 days |
| ExchangeRate-API | 1,500 | Daily | Any | Yes | No | >99.99% in 2024 |
| Frankfurter | Unlimited | Daily | Any | Yes (BANXICO) | Yes (Docker) | No formal SLA/page |
| CurrencyFreaks | 1,000 | Daily | USD only | Yes | No | ~100% last month |

---

## 7. Recommendation and Fallback Strategy

**Recommended primary provider for v1: ExchangeRate-API.**

Rationale:
- Its **free tier fully covers v1 needs**: daily updates (which the issue explicitly says is sufficient), 1,500 requests/month, and **any base currency** — critical because Prometheus households may choose MXN as their Reporting Currency.
- It has a **strong reliability track record** (>99.99% uptime in 2024, AWS multi-AZ, Cloudflare) and a public status page.
- It offers **clear upgrade paths** if Prometheus later needs hourly or 5-minute rates.
- Integration is straightforward: a single REST GET with a path-based API key.

**Fallback strategy:**
1. If ExchangeRate-API is unavailable, fall back to **Frankfurter** (`https://api.frankfurter.dev/v2/rate/USD/MXN?providers=BANXICO` for an official MXN rate, or the blended rate if BANXICO is unavailable). Frankfurter requires no API key, so it can be used immediately.
2. If both providers fail, return the **most recently cached rate** and retry on the next scheduled refresh.
3. For daily refreshes, cache the result for 24 hours to avoid hitting quotas.

**Why not the others as primary?**
- **Open Exchange Rates** and **CurrencyFreaks** lock the free tier to USD base, which would break MXN-denominated reporting.
- **Frankfurter** is excellent for cost and data provenance, but it lacks a formal SLA/status page and support; it is better suited as a free, zero-friction fallback.

---

## 8. Executive Summary (for issue resolution comment)

For Prometheus v1, **ExchangeRate-API** is the recommended exchange-rate provider. Its free plan provides daily USD/MXN rates (and 164 other currencies), allows any base currency, includes 1,500 monthly requests, and has a documented >99.99% uptime record. Integration is a simple REST call (`/v6/{key}/latest/{base}` or `/v6/{key}/pair/{from}/{to}`). If ExchangeRate-API is ever down, the free, no-key **Frankfurter** API should be used as a fallback, optionally filtering to the Banco de México provider for an official MXN rate. If both services are unavailable, the app should serve the last cached daily rate. This setup costs $0 for v1 and keeps the door open to paid tiers if faster refresh rates are needed later.

---

## Sources

[^oxr-pricing]: Open Exchange Rates — Pricing and App ID Signup. Fetched 2026-07-14. https://openexchangerates.org/signup
[^oxr-currencies]: Open Exchange Rates — Supported Currencies. Fetched 2026-07-14. https://oxr.readme.io/docs/supported-currencies
[^oxr-docs-latest]: Open Exchange Rates API Reference — `/latest.json`. Fetched 2026-07-14. https://docs.openexchangerates.org/reference/latest-json
[^oxr-docs-base]: Open Exchange Rates API Reference — changing `base` is available on paid plans. Fetched 2026-07-14. https://docs.openexchangerates.org/reference/latest-json
[^oxr-status]: Open Exchange Rates Status Page. Fetched 2026-07-14. https://status.openexchangerates.org
[^oxr-home]: Open Exchange Rates homepage. Fetched 2026-07-14. https://openexchangerates.org

[^era-pricing]: ExchangeRate-API — Plans & Pricing. Fetched 2026-07-14. https://www.exchangerate-api.com/#pricing
[^era-currencies]: ExchangeRate-API — Supported Currencies. Fetched 2026-07-14. https://www.exchangerate-api.com/docs/supported-currencies
[^era-standard]: ExchangeRate-API — Standard Requests. Fetched 2026-07-14. https://www.exchangerate-api.com/docs/standard-requests
[^era-data]: ExchangeRate-API — Our Exchange Rate Data. Fetched 2026-07-14. https://www.exchangerate-api.com/product/our-exchange-rate-data
[^era-uptime]: ExchangeRate-API — API Uptime. Fetched 2026-07-14. https://www.exchangerate-api.com/product/uptime
[^era-status]: ExchangeRate-API — Pingdom Status Page. Fetched 2026-07-14. http://stats.pingdom.com/qv69spvrz94m
[^era-docs]: ExchangeRate-API — Documentation Overview. Fetched 2026-07-14. https://www.exchangerate-api.com/docs/overview

[^frank-docs]: Frankfurter — API Documentation. Fetched 2026-07-14. https://frankfurter.dev/
[^frank-v1]: Frankfurter — v1 API Documentation. Fetched 2026-07-14. https://frankfurter.dev/v1/
[^frank-currencies]: Frankfurter — Currencies. Fetched 2026-07-14. https://frankfurter.dev/currencies/
[^frank-banxico]: Frankfurter — Banco de México (BANXICO) Provider. Fetched 2026-07-14. https://frankfurter.dev/providers/banxico/
[^frank-deploy]: Frankfurter — Deploy / Self-hosting. Fetched 2026-07-14. https://frankfurter.dev/deploy/
[^frank-github]: Frankfurter GitHub repository. Fetched 2026-07-14. https://github.com/lineofflight/frankfurter

[^cf-pricing]: CurrencyFreaks — Pricing Plans. Fetched 2026-07-14. https://currencyfreaks.com/pricing
[^cf-docs]: CurrencyFreaks — API Documentation. Fetched 2026-07-14. https://currencyfreaks.com/documentation
[^cf-currencies]: CurrencyFreaks — Supported Currencies. Fetched 2026-07-14. https://currencyfreaks.com/supported-currencies
[^cf-status]: CurrencyFreaks — Status Page. Fetched 2026-07-14. https://status.currencyfreaks.com
