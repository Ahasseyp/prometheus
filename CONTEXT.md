# Prometheus personal finance tracker/planner

Domain language for a mobile-first, multi-currency personal finance tracker/planner centered on AI-driven voice and text interaction.

## Language

**User**:
A person who authenticates into the app and belongs to a Household.
_Avoid_: Account (in the login sense), customer

**Household Owner**:
A User who can manage Household membership and delete the Household.
_Avoid_: Admin, superuser

**Household Member**:
A User who can create, edit, and delete Accounts, transactions, budgets, and goals within a Household.
_Avoid_: Editor, contributor

**Loan**:
An Account representing money borrowed by the Household. Its balance is the remaining amount owed, which reduces the Household's net worth.
_Avoid_: Debt, liability, mortgage

**Account Type**:
A classification of an Account: checking, savings, credit card, cash, investment, or loan.
_Avoid_: Account kind, category

**Account Currency**:
The single fixed Currency in which an Account is denominated. All Transactions recorded against that Account use its Account Currency, and its Balance is expressed in that Currency.
_Avoid_: Account's money, currency setting

**Account**:
A financial container owned by a Household, such as a checking account, credit card, savings account, wallet, investment, or loan. Each Account has exactly one Account Currency.
_Avoid_: Wallet, profile

**Transaction**:
A movement of Money into or out of an Account.
_Avoid_: Expense, income, payment, charge

**Transfer**:
A pair of linked Transactions that moves Money from one Account to another Account. A cross-currency Transfer connects two Transactions denominated in different Account Currencies and stores the Exchange Rate used.
_Avoid_: Move, internal transaction

**Transaction Type**:
A classification of a Transaction: income, expense, or transfer.
_Avoid_: Direction, flow

**Split Transaction**:
A Transaction whose total amount is divided among multiple Categories, represented as Transaction Line Items.
_Avoid_: Itemized transaction, breakdown

**Transaction Line Item**:
A portion of a Transaction assigned to a specific Category, with its own Money amount.
_Avoid_: Split, allocation, line

**System Category**:
A Category provided by the app to help new Households get started. System Categories can be renamed but not deleted.
_Avoid_: Default category, built-in category

**Custom Category**:
A Category created by a Household.
_Avoid_: User category, private category

**Category**:
A label that classifies a Transaction by what it represents (e.g., groceries, salary, rent). Categories can be nested one level under a parent Category.
_Avoid_: Tag, bucket, group

**Subcategory**:
A Category that belongs to a parent Category; a Category may have at most one level of Subcategories.
_Avoid_: Nested category, child category

**Budget**:
A planned spending limit for a Category or set of Categories over a Budget Period, denominated in the Household's Reporting Currency.
_Avoid_: Limit, spending plan

**Budget Period**:
The time interval over which a Budget is tracked, such as monthly, weekly, or yearly.
_Avoid_: Duration, frequency

**Rollover**:
The unused amount of a Budget that carries over to the next Budget Period.
_Avoid_: Carryover, surplus

**Recurring Transaction**:
A schedule that defines repeated income or expense Transactions, used to generate individual Transaction instances. A generated instance can be skipped without breaking the schedule.
_Avoid_: Subscription, scheduled payment, repeat

**Transaction Instance**:
A single occurrence generated from a Recurring Transaction.
_Avoid_: Occurrence, generated transaction

**Skipped Instance**:
A Transaction Instance that was not created because the user chose to skip it for a particular occurrence.
_Avoid_: Skipped occurrence, exception

**Goal**:
A savings target with a target amount, a deadline, and one or more funding Accounts, all denominated in the same Currency. The saved amount is an allocation of money that still belongs to the Account balance, like a virtual bucket.
_Avoid_: Target, objective, wishlist

**Goal Contribution**:
A record that moves Money from an Account's unallocated balance into a Goal's saved amount.
_Avoid_: Deposit, allocation, transfer

**Unallocated Balance**:
The portion of an Account's Balance that is not earmarked by any Goal.
_Avoid_: Available balance, free balance

**Investment Account**:
An Account of type `investment` or `savings` whose value is tracked as a total balance, without individual holdings. Interest or returns are recorded as income Transactions; market-value updates use Balance Adjustments.
_Avoid_: Brokerage account, portfolio account

**Balance Adjustment**:
A Transaction that corrects an Account's Balance without representing a real-world income or expense, such as updating an investment account to match market value.
_Avoid_: Reconciliation, correction, manual entry

**Investment**:
An external asset or holding tracked by the app, linked to an Account for valuation.
_Avoid_: Portfolio, holding, stock

**Household**:
A group of Users that share access to a set of Accounts, transactions, budgets, and goals; the unit of multi-user collaboration. A Household has exactly one Household Owner and may have multiple Household Members. In v1 a Household usually contains one User, but it is designed for couples or families from the start.
_Avoid_: Organization, tenant, family, profile

**Currency**:
The unit of money in which an Account, Transaction, or valuation is denominated, expressed as an ISO 4217 code. The Household may have a default reporting Currency while Accounts keep their own Currency.
_Avoid_: Money, denomination

**Reporting Currency**:
The default Currency of a Household, used for Budgets, dashboards, net-worth summaries, and other cross-Account reports. A Household chooses its Reporting Currency at creation and may change it later; historical reports keep the Currency they were originally computed in.
_Avoid_: Base currency, home currency

**Exchange Rate**:
The rate used to convert a Money amount from one Currency to another. A per-Transaction Exchange Rate is stored at creation so historical reports reflect the rate on the transaction date; current balances and net worth use the latest available rate. Users may override any stored rate.
_Avoid_: Conversion rate, FX rate

**Money**:
A quantity of value in a specific Currency, used for transactions, balances, budgets, and goals.
_Avoid_: Amount, balance, value

**Balance**:
The current value of an Account, derived from its transaction ledger and kept in sync via a cached value for fast reads. For a loan, the balance is the amount still owed.
_Avoid_: Amount, available balance, current value

**Entry**:
A single record created by a user, AI assistant, or import that captures the details of a Transaction or adjustment.
_Avoid_: Record, line item, input

**Insight**:
A generated summary, comparison, or projection produced by the AI assistant from financial data.
_Avoid_: Report, advice, tip, notification

**Command**:
A user intent directed at the AI assistant, such as entering data, asking a question, or triggering an action.
_Avoid_: Query, instruction, action, operation

**Assistant**:
The AI-driven feature that interprets voice or text Commands and produces Entries, Insights, or app actions.
_Avoid_: Bot, chatbot, AI
