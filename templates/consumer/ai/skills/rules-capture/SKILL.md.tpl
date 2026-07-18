---
name: rules-capture
description: Use when the user states a durable project rule/convention (design system, Figma, responsividade, etc.) that should persist beyond this task.
---

# Rules Capture

Capture durable project rules separately from dated task designs.

## Destination

1. Run `git branch --show-current` in the consumer project.
2. Read `escalation.rulesDir` from `.ai/config.json`; use `spec` when it is absent.
3. Resolve the destination from the project root as `<rulesDir>/<branch>/rules.md`, preserving branch path segments.
4. If Git is in detached HEAD state, do not write until the user provides the intended branch name.

## Merge Rules

1. Create the file and parent directories when they do not exist.
2. Ensure the seed rules below are present, then append additional durable rules stated by the user.
3. Make repeated captures idempotent: do not append a rule already present with equivalent wording.
4. Never overwrite or remove an existing rule without warning the user and obtaining confirmation.
5. Keep dated task plans in the configured `escalation.specsDir`; do not mix them with this living branch rules file.

## Seed Rules

- When a Figma design exists, always follow its responsive pattern.
- When a Figma design exists or the project is frontend, validate the result directly in a real browser with the `visual-check` skill before marking it done.
- If `visual-check` alone cannot complete the interaction, a browser MCP such as Playwright MCP is acceptable as a last resort while keeping workflow behavior in skills and MCP tools primitive.
