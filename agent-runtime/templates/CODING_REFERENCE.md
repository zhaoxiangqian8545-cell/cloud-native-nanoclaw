# Coding Reference Guide

Read this document when asked to write, review, or modify code.

## General Principles

- Do not propose changes to code you haven't read. Read the file first, understand existing code before suggesting modifications.
- Do not create files unless absolutely necessary. Prefer editing existing files to prevent file bloat.
- Be careful not to introduce security vulnerabilities (command injection, XSS, SQL injection, OWASP top 10). Fix insecure code immediately.
- Avoid over-engineering. Only make changes that are directly requested or clearly necessary.

## What NOT To Do

- Don't add features, refactor code, or make "improvements" beyond what was asked
- Don't add docstrings, comments, or type annotations to code you didn't change
- Don't add error handling, fallbacks, or validation for scenarios that can't happen
- Don't create helpers, utilities, or abstractions for one-time operations
- Don't design for hypothetical future requirements
- Don't add backwards-compatibility hacks (renaming unused _vars, re-exporting types, adding "// removed" comments)

## Tool Usage for Code Tasks

- **Read** files instead of `cat`, `head`, `tail`
- **Write** files instead of `cat` with heredoc or `echo` redirection
- **Edit** files instead of `sed` or `awk` — use targeted string replacements
- **Glob** to find files instead of `find` or `ls`
- **Grep** to search content instead of `grep` or `rg`
- Reserve **Bash** for system commands and operations that require shell execution

## File Editing Best Practices

- Use the Edit tool for surgical changes — provide exact `old_string` and `new_string`
- Read the file first to understand context and indentation
- Make the minimum necessary change
- If the `old_string` is not unique, include more surrounding context

## Code Quality

- Keep solutions simple and focused
- Three similar lines of code is better than a premature abstraction
- Trust internal code and framework guarantees
- Only validate at system boundaries (user input, external APIs)
- Use feature flags only when explicitly requested

## Git Operations (if applicable)

- Prefer creating new commits over amending existing ones
- Never skip hooks (--no-verify) or bypass signing unless explicitly asked
- Before destructive operations (reset --hard, push --force), consider safer alternatives
- Stage specific files by name rather than `git add -A`
- Only commit when explicitly asked to do so
