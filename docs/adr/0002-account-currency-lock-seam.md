# Account currency is fixed after creation

## Status

Amended (currency fully locked on update; see Consequences)

## Context

Issue #23 requires each Account to have a fixed Account Currency. The domain meaning is that an account's currency should not change arbitrarily, because balances and transactions are denominated in that currency.

At the time of implementing #23 there is no transaction feature yet, so we cannot determine whether an account has transactions. We still want the UI to enforce the fixed-currency rule as soon as transactions are introduced.

## Decision

Originally: `AccountForm` accepts an optional `hasTransactions?: boolean` prop as a seam — when true, the currency field is disabled; until transactions exist the field stays editable.

Amended during the #23 review: the "fixed currency" rule is a domain invariant, and leaving the update API open violated the spec. The update procedure (`updateAccountInputSchema` / `updateAccount`) no longer accepts `currency`, and `AccountForm` locks the currency field whenever editing. The `hasTransactions` seam was removed.

## Consequences

- Currency cannot change after creation, enforced at the API rather than only in the UI.
- Correcting a mistaken currency requires deleting and recreating the account — acceptable while no transactions exist.
- If a currency-change flow is ever needed (e.g. for accounts with no transactions), it must be added deliberately as a new guarded path.
