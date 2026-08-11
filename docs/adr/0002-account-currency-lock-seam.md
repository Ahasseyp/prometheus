# Account currency is locked in edit mode once transactions exist

## Status

Accepted

## Context

Issue #23 requires each Account to have a fixed Account Currency. The domain meaning is that an account's currency should not change arbitrarily, because balances and transactions are denominated in that currency.

At the time of implementing #23 there is no transaction feature yet, so we cannot determine whether an account has transactions. We still want the UI to enforce the fixed-currency rule as soon as transactions are introduced.

## Decision

`AccountForm` accepts an optional `hasTransactions?: boolean` prop. When the prop is `true` (or when editing an account and transactions exist), the currency field is disabled and a description explains why. When the prop is omitted/false, the currency field remains editable so users can correct a mistake before any transactions are recorded.

This prop is a deliberate seam: the transaction feature will pass the real flag once it exists. Until then, callers do not pass it and the field stays editable.

## Consequences

- The form already knows where to enforce the rule, so the transaction feature will not need to refactor the form.
- The current UI does not lock currency in edit mode, which is acceptable only while no transactions exist.
- Once transactions are implemented, every edit-mode caller must query whether the account has transactions and pass `hasTransactions={true}` when it does.
