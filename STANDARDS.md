# Project Standards

This repo follows a small set of written standards. Refer to the child documents for detail:

- [Coding standards](CODING_STANDARDS.md) — languages, style, monorepo conventions, testing, and domain language.
- [Contributing guidelines](CONTRIBUTING.md) — branches, commits, reviews, and issue workflow.

## Scope

These standards apply to all code, tests, and documentation in the Prometheus personal-finance tracker.

## Principles

1. **Vertical slices first.** A feature ticket should deliver a narrow, end-to-end path (schema → API → UI → tests) rather than a horizontal layer.
2. **Wide refactors use expand–contract.** Add the new form beside the old, migrate call sites in green batches, then delete the old form.
3. **Domain language drives names.** Use the vocabulary defined in [CONTEXT.md](CONTEXT.md) so the code mirrors the product.
4. **Tooling is shared.** All packages share the same TypeScript, ESLint, and Prettier configurations from the root workspace.
5. **Tests are required.** New behaviour is test-driven at pre-agreed seams; existing behaviour is covered before it is refactored.
