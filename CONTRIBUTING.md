# Contributing Guidelines

## Issue workflow

Work is tracked in GitHub issues. A ticket should be a vertical tracer bullet: a narrow slice that is demoable or verifiable on its own.

- Pick issues labeled `ready-for-agent`.
- Do not close or modify parent epics when creating sub-issues.
- When a ticket is ambiguous, ask before implementing.

## Branches

Create a feature branch from the appropriate base. For a standalone ticket, branch from `main`. For a sub-issue of a larger feature, branch from the parent integration branch.

Name it with a type prefix, the issue number, and a short description:

```
<type>/issue-<number>/<short-description>
```

Type prefixes:

- `feat` — new feature or behaviour
- `fix` — bug fix
- `chore` — tooling, config, dependencies, or workspace changes
- `refactor` — code changes that neither fix bugs nor add features
- `docs` — documentation-only changes

Examples:

```
chore/issue-35/scaffold-workspace
feat/issue-36/money-helper
fix/issue-42/recurring-transaction-offset
```

### Integration branches for multi-sub-issue work

When a parent issue is split into vertical sub-issues, create an integration branch from `main` and name it after the parent issue:

```
chore/issue-21/scaffold-all-subissues
```

Each sub-issue then branches from the integration branch and opens a PR back into it:

```
main
└── chore/issue-21/scaffold-all-subissues
    ├── chore/issue-35/scaffold-workspace
    ├── feat/issue-36/money-helper
    ├── feat/issue-37/api-health
    ├── feat/issue-38/web-landing-page
    └── chore/issue-39/integration-ci
```

Only the integration branch opens a PR to `main` once all sub-issues are merged.

## Commits

- Keep commits small and focused on one logical change.
- Write clear, descriptive messages in the imperative mood using the format:

```
<type>(<domain>): <description>
```

- `type` matches the branch prefix (`feat`, `fix`, `chore`, `refactor`, `docs`).
- `domain` is the area touched, such as `workspace`, `domain`, `api`, `web`, `ci`, or `docs`.
- `description` is a short imperative summary.

Examples:

```
chore(workspace): scaffold pnpm workspace and shared tooling
feat(domain): add Money helper with Dinero.js
feat(api): add health endpoint through tRPC
chore(ci): add GitHub Actions workflow for lint/typecheck/test
```

- Do not commit secrets, API keys, or `.env` files.
- Do not commit without confirmation when asked not to.

## Pre-commit checks

Before asking for commit approval, run:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

Fix failures before opening a PR or committing.

## Code review

- Request a review after the checks above pass.
- Reviews look at two axes independently:
  1. **Standards** — does the change follow the coding standards and avoid code smells?
  2. **Spec** — does the change implement only what the issue asked for, correctly?
- Address review feedback in follow-up commits on the same branch.

## Pull requests

- Fill out the PR template if one exists.
- Reference the issue number in the PR body (`Closes #35` or `Relates to #21`).
- Keep the diff focused on the ticket; move unrelated changes to a separate PR.
- Ensure CI passes before merging.

## Prototypes and experiments

- Prototypes live in `prototypes/` and are not production code.
- If a prototype proves a decision that should be permanent, record it in an ADR under `docs/adr/` and migrate the relevant code into the monorepo.

## Getting help

- Ask in the issue thread if the spec is unclear.
- Check existing ADRs in `docs/adr/` before introducing new architectural patterns.
- Use the domain glossary in [CONTEXT.md](CONTEXT.md) when naming things.
