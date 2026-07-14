# Research: Mexico Bank Aggregation and Open Banking APIs

**Ticket:** #6 — Research: Mexico bank aggregation and open banking APIs  
**Map:** #1 — Map: Architecture for AI-first personal finance tracker/planner  
**Repo:** Ahasseyp/prometheus  
**Date:** 2026-07-13  
**Researcher:** opencode (k2p7)

## 1. Executive Summary

For a Mexico-focused personal finance app that needs to import transactions from BBVA, NU (Nubank), American Express, and other institutions, **the market is not ready for a fully-featured bank aggregation feature today.**

- **No major global aggregator lists Mexico as a supported country for consumer bank transaction import.** Plaid’s public coverage selector is limited to the United States, United Kingdom, and European Union; its global coverage page does not list Mexico among available markets. Salt Edge is focused on Europe and the UK (PSD2/open banking). Yodlee mentions 17,000+ data sources globally but does not publish a Mexico institution list.
- **The two largest Latin American open-finance players, Belvo and Fintoc, operate in Mexico but do not offer consumer transaction aggregation there.** Belvo Mexico offers employment data, fiscal data, account validation, and direct-debit payments; banking data aggregation is only available in Brazil. Fintoc Mexico offers SPEI payments, transfers, and cash payments; its “Movements” (bank transaction aggregation) product only covers Chile.
- **No public, third-party developer API for transaction export was found for BBVA México, NU México, or American Express México.** These institutions’ developer portals are aimed at merchants, partners, or corporate use cases, not at letting consumers pull their own transaction histories into a personal finance app.
- **Mexico has a Fintech Law (Ley Fintech, 2018) that creates a legal basis for open banking/APIs**, regulated by CNBV and Banxico, but practical implementation has been gradual and primarily focused on payments and credit underwriting rather than broad read-only account aggregation.

**Preliminary recommendation:** Keep manual entry and receipt/statement import as the v1 path. For architecture, design an abstraction layer so a future aggregation provider can be plugged in without rewriting the account/transaction model. Re-evaluate Belvo/Fintoc quarterly, since they are the most likely LATAM candidates to add Mexico banking aggregation.

## 2. What the Map Says

- **Market:** Mexico, with users banking at BBVA, NU, and American Express.
- **Timing:** This is explicitly **not** for v1; manual entry is v1.
- **Product context:** Public product from day one, so architecture should accommodate bank aggregation later.
- **Currency:** Multi-currency (USD income, MXN expenses). Any aggregator must handle MXN and ideally USD-denominated accounts.

## 3. Regulatory Context: Mexico Open Banking / Fintech Law

### 3.1 Ley Fintech (2018)

Mexico enacted the **Ley para Regular las Instituciones de Tecnología Financiera** (Ley Fintech) in March 2018. It is the principal legal framework for fintechs, crowdfunding, electronic payment funds, virtual assets, and open financial data APIs. Regulators are the **Comisión Nacional Bancaria y de Valores (CNBV)** and **Banco de México (Banxico)**.

Key points relevant to bank aggregation:

- **API obligations:** The law empowers regulators to require financial institutions to expose standardized APIs to share information and initiate transactions, subject to user consent.
- **Scope:** It covers regulated entities (banks, SOFOMs, fintechs, etc.) and creates a sandbox (Instituto de Innovación Financiera) for supervised testing.
- **Status:** While the legal framework exists, the actual rollout of open banking APIs has been phased and slow. As of 2024–2025, practical use cases remain concentrated in payments, credit scoring, and KYC rather than broad read-only transaction aggregation for personal finance apps.

> **Source limitation:** The official CNBV and Diario Oficial de la Federación sites (the primary publishers of the law and secondary regulations) were unreachable during this research due to transport errors and Cloudflare challenges. The summary above is consistent with the widely documented provisions of the law, but we should re-verify exact article citations and current implementing rules from CNBV/Banxico before making compliance decisions. A good starting point is the [Banxico homepage](https://www.banxico.org.mx/) and, once accessible, the CNBV fintech regulation page.

### 3.2 CoDi and SPEI

Banxico operates **SPEI** (Sistema de Pagos Electrónicos Interbancarios), the real-time interbank payment rail. **CoDi** (Cobro Digital) is a Banxico-promoted QR/NFC payment system built on SPEI. These are payment infrastructure, not transaction-history APIs, but they are relevant because:

- Any payment-initiation feature in Mexico will likely use SPEI.
- A future aggregation feature might supplement bank data with SPEI/CoDi payment records if banks expose them via APIs.

> Primary source: [Banxico homepage](https://www.banxico.org.mx/) (links to SPEI/CoDi sections were not reachable during research).

## 4. Third-Party Aggregators

### 4.1 Plaid

**Coverage**
- Plaid’s public global coverage page promotes “20 countries” and “12,000+ institutions” but its country selector only lists **United States, United Kingdom, and European Union** [[Plaid Global Coverage](https://plaid.com/global/)].
- No Mexico-specific coverage page or institution list was found.
- **Conclusion:** Plaid does not appear to support Mexican consumer bank accounts for transaction aggregation today.

**Products**
- Account aggregation, balance, transactions, identity, investments, liabilities, payments, credit underwriting, etc. [[Plaid API Docs](https://plaid.com/docs/api/)]
- These products are available in the supported markets (US/UK/EU), not Mexico.

**Pricing**
- Pay-as-you-go, Growth, and Custom plans. Per-product fees are one-time, subscription, or per-request [[Plaid Pricing](https://plaid.com/pricing)].
- No Mexico-specific pricing.

**Relevance:** Low for Mexico today. Monitor if Plaid expands to Mexico.

### 4.2 Yodlee (Envestnet)

**Coverage**
- Yodlee claims **17,000+ data sources** globally [[Yodlee Developer Portal](https://developer.yodlee.com/)].
- Public pages do not list a Mexico coverage map or supported Mexican institutions.
- A 2025 Envestnet corporate overview cites 19,000+ data sources and 44M+ paid users, but does not break out Mexico [[Envestnet Financial Ecosystem](https://www.envestnet.com/yodlee)].

**Products**
- Account aggregation, account verification, transaction data, credit insights, cash-flow predictions, open banking [[Yodlee Products](https://developer.yodlee.com/products)].

**Pricing**
- Not public; contact sales.

**Relevance:** Uncertain. Yodlee has global reach, but without a published Mexico institution list, we cannot confirm coverage of BBVA, NU, or American Express Mexico. Worth a direct sales inquiry.

### 4.3 Salt Edge

**Coverage**
- Salt Edge focuses on **open banking in Europe and the UK**. It lists coverage by country for Germany, UK, France, Italy, Austria, etc., and emphasizes PSD2 compliance [[Salt Edge](https://www.saltedge.com/)].
- No Mexico country page or institution list was found; the corporate banking product page URL we tried returned 404.

**Products**
- Data aggregation, payment initiation, open banking compliance, data enrichment, AML monitoring.

**Pricing**
- Not public; contact sales.

**Relevance:** Low for Mexico. Salt Edge is primarily an EU/UK provider.

### 4.4 Belvo

**Coverage**
- Belvo operates in **Brazil** and **Mexico**, with the following products by country (from its developer portal navigation) [[Belvo Developer Portal](https://developers.belvo.com/)]:
  - Brazil: Banking, Employment, Payments
  - Mexico: Employment, Fiscal, Payments
- **Banking data aggregation is only available in Brazil.** Mexico does not have a “Banking Mexico” product.

**Mexico-specific products**
- **Employment data:** access to official employment records.
- **Fiscal data:** tax returns and invoicing history.
- **Account validation:** confirm account ownership and active status.
- **Income verification / Income Estimator:** validate and forecast income.
- **Domiciliación bancaria (Direct debit / bank payments):** recurring bank-to-bank collections via SPEI rails [[Belvo México](https://belvo.com/es/)].

**Pricing (Mexico)**
- **Sandbox:** free for testing.
- **Launch:** **$1,000 USD/month**.
- **Growth:** custom pricing.
- Production access requires a paid plan [[Belvo Planes y Precios México](https://belvo.com/es/planes-precios/)].

**Relevance:** Medium. Belvo is a strong LATAM open-finance platform and already works with Mexican banks for payments and employment/fiscal data. It is the most likely candidate to add Mexico banking aggregation in the future, but it does not offer it today.

### 4.5 Fintoc

**Coverage**
- Fintoc operates in **Chile** and **Mexico**.
- **Movements (bank transaction aggregation):** only supported for Chilean banks (Banco de Chile, Santander, Itaú, BICE, Scotiabank, BCI, Estado, Security) [[Fintoc Movements — Products and Institutions](https://docs.fintoc.com/docs/products-and-institutions-movements)].
- **Payments / Transfers in Mexico:** supports all institutions participating in SPEI [[Fintoc Payment Initiation — Countries and Institutions](https://docs.fintoc.com/docs/payment-initiation-countries-and-institutions)].
- Mexico-specific features include cash payments and SPEI transfers [[Fintoc Docs](https://docs.fintoc.com/)].

**Pricing**
- Pricing is plan-based and not fully public. Fintoc charges fees per resource (payment intent, refund, transfer) plus **16% VAT in Mexico** [[Fintoc Fees](https://docs.fintoc.com/docs/fintoc-fees)].
- Contact sales for exact rates.

**Relevance:** Medium for payments, low for transaction aggregation. Fintoc is live in Mexico for payments and transfers but does not aggregate bank transactions there.

### 4.6 Kiban (brief mention)

- **Kiban** (`https://www.kiban.com/`) appears to be a Mexican credit/lending platform for businesses (“Plataforma integral para empresas de crédito”).
- Public site does not document a bank transaction aggregation API for third-party developers.
- **Relevance:** Low/unverified. Not a clear alternative to Belvo/Fintoc for this use case.

## 5. Bank-Specific Developer APIs

### 5.1 BBVA México

- **BBVA México** (`https://www.bbva.mx/`) is the country’s largest bank by customers and one of the likely target institutions.
- **No public developer portal for Mexican retail banking APIs was found.** The global BBVA developer site (`https://developer.bbva.com/`) was unreachable during research, and BBVA México’s consumer site does not advertise a transaction-export API.
- BBVA’s global/European open banking APIs are primarily for PSD2 markets (Spain/UK/EU), not Mexico.
- **Conclusion:** A direct API for consumer transaction import from BBVA México is not available today.

### 5.2 NU (Nubank) México

- **NU México** (`https://nu.com.mx/`) operates as a neobank in Mexico; it is part of the same group as Nubank Brazil (`https://www.nubank.com.br/`) [[Nubank Brazil footer](https://www.nubank.com.br/)].
- **No public consumer API for transaction export was found.** Nubank Brazil has internal APIs for its app, but no public developer portal for third-party aggregation.
- **Conclusion:** Direct API aggregation of NU México accounts is not available today.

### 5.3 American Express México

- **American Express Developers** (`https://developer.americanexpress.com/`) exists but returned minimal crawlable content during research.
- Amex developer APIs are generally aimed at **merchants, partners, and corporate/enterprise** use cases (e.g., transaction intelligence, loyalty, card issuance), not at letting consumers pull their own card transactions into a personal finance app.
- **Conclusion:** No public consumer transaction aggregation API for American Express México was identified.

## 6. Comparison Matrix

| Provider | Mexico consumer bank aggregation? | Mexico products available | Coverage evidence | Pricing transparency | Best fit for this project |
|---|---|---|---|---|---|
| **Plaid** | No | US/UK/EU products | Country selector lacks Mexico [[Plaid Global](https://plaid.com/global/)] | Public US/UK pricing | Low today; monitor expansion |
| **Yodlee** | Unverified | Global aggregation | Claims 17K+ sources; no Mexico list [[Yodlee Dev](https://developer.yodlee.com/)] | Contact sales | Investigate via sales |
| **Salt Edge** | No | EU/UK aggregation | Country flags are EU/UK only [[Salt Edge](https://www.saltedge.com/)] | Contact sales | Low |
| **Belvo** | **No** | Employment, Fiscal, Payments, Account validation, Income verification | Dev portal lists Mexico products but no Banking Mexico [[Belvo Dev](https://developers.belvo.com/)] | Public Launch plan: $1,000/mo [[Belvo Pricing](https://belvo.com/es/planes-precios/)] | Most likely future LATAM aggregator |
| **Fintoc** | **No** | SPEI payments, transfers, cash payments | Movements only in Chile; Mexico = payments [[Fintoc Movements](https://docs.fintoc.com/docs/products-and-institutions-movements)] | Custom + 16% VAT [[Fintoc Fees](https://docs.fintoc.com/docs/fintoc-fees)] | Watch for Movements expansion |
| **BBVA México** | No | N/A | No public retail API | N/A | N/A |
| **NU México** | No | N/A | No public consumer API | N/A | N/A |
| **Amex México** | No | N/A | Developer portal aimed at merchants | N/A | N/A |

## 7. Cost Overview

| Provider | Pricing model | Public starting price | Notes |
|---|---|---|---|
| Plaid | Per-product, pay-as-you-go / growth / custom | Not fully public | US/UK/EU only; Mexico not listed |
| Yodlee | Custom enterprise | Contact sales | No public Mexico price |
| Salt Edge | Custom enterprise | Contact sales | EU/UK focused |
| Belvo | Launch / Growth / Custom | **$1,000 USD/month** for Mexico [[Belvo Pricing](https://belvo.com/es/planes-precos/)] | Production requires paid plan; sandbox free |
| Fintoc | Custom + VAT | Contact sales | Mexico VAT 16% documented [[Fintoc Fees](https://docs.fintoc.com/docs/fintoc-fees)] |

## 8. Regulatory & Compliance Constraints

- **User consent:** Any open banking/aggregation feature must obtain explicit user consent and allow revocation.
- **Data localization:** Mexico has personal data protection laws (LFPDPPP) and fintech regulations. Check whether provider data residency is required.
- **Licensing:** Using a regulated aggregator (Belvo/Fintoc) can reduce the need for the app to obtain its own financial institution license, similar to how Salt Edge operates under its own EU licenses.
- **Screen scraping:** If official APIs are unavailable, some legacy aggregators have used screen scraping/credential-based login. This is **fragile, high-friction, and legally risky** in Mexico under the Fintech Law and data-protection rules; it should not be the primary architecture.
- **Multi-currency:** Banxico’s FIX exchange rate is the official reference for MXN/USD. If an aggregator eventually provides MXN transactions, the app will still need to convert USD income and MXN expenses using official rates or market rates.

## 9. Architecture Implications

For the v1 architecture (manual entry), plan for future aggregation by:

1. **Abstracting the transaction import interface** behind a provider-agnostic adapter so Belvo, Fintoc, Yodlee, or Plaid can be plugged in later.
2. **Storing institution metadata** (institution ID, country, currency, account type, provider) so accounts can be linked to a future aggregator.
3. **Supporting multi-currency from the start** (already in the map), since MXN/USD handling is required regardless of aggregation source.
4. **Avoiding hard-coding screen-scraping logic**; if scraping is ever needed, treat it as a throwaway bridge, not core architecture.
5. **Keeping user consent and data-deletion flows clean** so they satisfy both LFPDPPP and open-banking consent requirements.

## 10. Open Questions / Next Steps

- [ ] Re-verify Mexico Fintech Law and current open banking implementation rules from primary sources (CNBV, Banxico, Diario Oficial) once sites are accessible.
- [ ] Contact Belvo sales to ask whether Banking Mexico is on the roadmap and what institutions would be supported (BBVA, NU, Amex).
- [ ] Contact Fintoc sales to ask whether Movements will be expanded to Mexico.
- [ ] Contact Yodlee sales to confirm Mexico institution coverage for BBVA, NU, and Amex.
- [ ] Confirm whether American Express México or BBVA México have any partner-only APIs that could be accessed via a commercial agreement.
- [ ] Design the transaction import adapter interface before v1 ships, even if the implementation is manual-only for now.

## 11. Sources

1. Plaid — Global coverage: https://plaid.com/global/
2. Plaid — API documentation: https://plaid.com/docs/api/
3. Plaid — Pricing: https://plaid.com/pricing/
4. Yodlee — Developer portal: https://developer.yodlee.com/
5. Yodlee — Products: https://developer.yodlee.com/products
6. Envestnet — Financial ecosystem / Yodlee: https://www.envestnet.com/yodlee
7. Salt Edge — Homepage: https://www.saltedge.com/
8. Belvo — Homepage: https://belvo.com/
9. Belvo — Developer portal (Mexico products): https://developers.belvo.com/
10. Belvo — Planes y precios México: https://belvo.com/es/planes-precios/
11. Fintoc — Docs homepage: https://docs.fintoc.com/
12. Fintoc — Movements products and institutions (Chile only): https://docs.fintoc.com/docs/products-and-institutions-movements
13. Fintoc — Payment initiation countries and institutions (Mexico SPEI): https://docs.fintoc.com/docs/payment-initiation-countries-and-institutions
14. Fintoc — Fees and VAT (Mexico 16%): https://docs.fintoc.com/docs/fintoc-fees
15. BBVA México — Homepage: https://www.bbva.mx/
16. Nubank Brazil — Homepage (links to Nu México): https://www.nubank.com.br/
17. American Express Developers: https://developer.americanexpress.com/
18. Banxico — Homepage: https://www.banxico.org.mx/
19. Kiban — Homepage: https://www.kiban.com/
