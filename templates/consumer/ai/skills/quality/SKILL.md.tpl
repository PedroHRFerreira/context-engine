---
name: quality
description: Use before finishing implementation work or when validating readiness.
---

# Quality

Detected stack: {{stackLabel}}

## Validation Order

1. Run the smallest relevant test, lint, or typecheck first.
2. Expand validation only when the touched surface or risk requires it.
3. If validation cannot run, state why and provide the exact command.
4. Avoid unrelated formatting, renames, and refactors.

## Visual Validation (UI Changes Only)

1. If the change touches rendered UI, open it in a real browser with the `visual-check` skill before marking it done.
2. Cover the happy path, at least one error state, and every responsive breakpoint affected.
3. Log the URLs and flows checked, temporary screenshots inspected, and gaps found.
4. Visual validation complements, and never replaces, unit tests, lint, and typecheck.
