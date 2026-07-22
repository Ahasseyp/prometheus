---
name: walkthrough
description: Before committing, walk the user through the working-tree changes in the clearest grouping — by dependency order when one change builds on another, or by area when changes are independent.
disable-model-invocation: true
---

Run a structured pre-commit walkthrough of the current working tree. The goal is to make the changes legible to the user before they decide to edit or commit.

## Steps

1. **Pin the scope.**
   - Default fixed point is `main`. If the branch tracks a different base, use that.
   - Run `git status --short` and `git diff --stat <fixed-point>`.
   - If the working tree is empty, report that and stop.

2. **Surface the shape.**
   - Show the status list and diff stat verbatim.
   - Call out new untracked files explicitly — they are easy to miss in a stat.

3. **Read the changes.**
   - Identify the high-touch files (schema, migrations, domain factories, API routes, config, docs).
   - Read them in parallel using `Read`.
   - For large generated files (lockfiles, build outputs) skip the read and just note them.

4. **Choose the narration mode.**
   - Use **dependency order** when changes form a producer-to-consumer chain (e.g., schema → migration → factory → route → consumer). This keeps the foundation legible before the file that uses it.
   - Use **area grouping** when changes are mostly independent or touch many disconnected files. Headings: Database/Schema, API, Domain, Tooling/CI/Docs.

5. **Narrate the changes.**
   - For each file, state what changed and why it matters in one sentence.
   - Keep code snippets short; prefer citing file paths over dumping full content.

6. **Invite review.**
   - End with: "Any part you want to dig deeper into or change before committing?"
   - Do not commit. Wait for the user's direction.

## Completion criterion

The user either approves the walkthrough, asks for edits, or requests a commit strategy. Do not commit without explicit confirmation.
