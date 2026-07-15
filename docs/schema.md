# Database schema

This document visualizes the PostgreSQL schema managed by Prisma in `apps/api/prisma/schema.prisma`.

```mermaid
erDiagram
    USER {
        uuid id PK
        string email UK
        string name
        datetime createdAt
        datetime updatedAt
    }

    HOUSEHOLD {
        uuid id PK
        string name
        string reportingCurrency
        datetime createdAt
        datetime updatedAt
    }

    HOUSEHOLD_MEMBERSHIP {
        uuid id PK
        uuid householdId FK
        uuid userId FK
        enum role
        datetime createdAt
        datetime updatedAt
    }

    USER ||--o{ HOUSEHOLD_MEMBERSHIP : "belongs to"
    HOUSEHOLD ||--o{ HOUSEHOLD_MEMBERSHIP : "includes"
```

## Notes

- A `User` can belong to many households through `HouseholdMembership`.
- A `Household` can include many users through `HouseholdMembership`.
- `HouseholdMembership.role` is an enum with values `OWNER` and `MEMBER`.
- A partial unique index on `HouseholdMembership(householdId) WHERE role = 'OWNER'` enforces **at most one OWNER per household**. The application layer ensures a household is created with exactly one OWNER.
- `User.email` is unique and normalized to lowercase by the domain factory.
