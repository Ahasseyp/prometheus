---
name: implement
description: "Implement a spec or ticket: branch, build, review, then ask before committing."
disable-model-invocation: true
---

Implement the work described by the user.

1. **Branch**. Pick the base branch per [CONTRIBUTING.md](../../../CONTRIBUTING.md): standalone ticket → `main`; sub-issue → parent integration branch. Create and check out a branch named `<type>/issue-<number>/<short-description>`, using the type prefix that matches the ticket (`feat`, `fix`, `chore`, `refactor`, `docs`). Completion: `git status` shows the new branch checked out and its base matches the contributing rule.

2. **Build**. Implement the spec or tickets, using /tdd at pre-agreed seams. Run typechecking and targeted tests regularly. Completion: every acceptance criterion is implemented and the latest targeted tests pass.

3. **Checks**. Run the pre-commit checks from [CONTRIBUTING.md](../../../CONTRIBUTING.md): `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`. Fix every failure before moving on. Completion: all four commands exit cleanly.

4. **Review**. Run /code-review and address every piece of feedback until the review reports approval. Completion: /code-review returns approval with no unresolved comments.

5. **Commit gate**. Ask the user whether to commit. If yes, write a commit message in the format `<type>(<domain>): <description>` matching the branch prefix. Do not commit without explicit approval. Completion: the user has answered yes or no; if yes, a commit exists on the branch with the correct message format.
