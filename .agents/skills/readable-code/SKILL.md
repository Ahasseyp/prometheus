---
name: readable-code
description: Enforce code readability over cleverness when writing, reviewing, or refactoring code. Use when generating code, reviewing pull requests, refactoring, or when the user asks for clean or maintainable code. Always apply these principles to all code output.
---

# Readable Code

Prioritize clarity and readability over cleverness and brevity in all code you produce. "Boring code" that is easy to read, debug, and modify is always preferable to compact or "elegant" code that increases cognitive load.

## Core Principles

### 1. One idea per line

Each line should express a single concept. If a line requires re-reading to understand, it's doing too much.

### 2. Name every step

Break complex processes into named intermediate variables or helper functions. The names act as documentation and make debugging trivial.

### 3. Isolate conditions

Extract compound boolean expressions into named variables or small functions. A well-named boolean is worth more than a terse conditional.

### 4. Avoid deep nesting

Use early returns and guard clauses instead of nested `if/else` or ternary chains. Flatten the control flow.

### 5. Resist method chain density

Long chains (`.filter().map().reduce()`) are fine when each step is simple. When any step is complex, break the chain into named steps.

### 6. Prefer explicit over implicit

Choose longer, explicit code over shorter code that relies on subtle language behavior, implicit coercions, or non-obvious operator precedence.

## Applying These Principles

When writing or reviewing code, check for these warning signs:

| Warning sign | Refactor to |
|---|---|
| Ternary inside ternary | Guard clauses or named helper |
| Boolean expression with 3+ conditions | Named boolean variables |
| Arrow function body > 1 expression | Named intermediate steps |
| Method chain with inline callbacks > 1 line | Named variables between steps |
| Conditional assignment with side effects | Separate the condition from the action |
| Dense destructuring with defaults and renames | Step-by-step extraction |

## Quick Reference

**Before writing code, ask:**
- Can someone unfamiliar with this codebase understand this in one read?
- If I need to add a condition to this later, will it stay readable?
- Are the "rules" of this logic named, or hidden in expressions?

**When reviewing code, flag:**
- Any line that packs multiple decisions
- Unnamed boolean logic
- Clever one-liners that would need a comment to explain

## Detailed Examples

For concrete before/after refactoring examples in TypeScript and general patterns, see [examples.md](examples.md).
