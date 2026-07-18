---
name: visual-check
description: Use when rendered UI must be validated in a real browser, including responsive and error states.
---

# Visual Check

Use a real Chromium browser managed by Playwright. Visual validation complements, and never replaces, automated tests, lint, or typecheck.

## First Use

1. Check whether Playwright-managed Chromium is already available outside the project dependencies.
2. If it is missing, ask for elevated approval before running `pnpm dlx playwright install chromium`.
3. The installation must not edit `package.json`, `package-lock.json`, `pnpm-lock.yaml`, or other project dependency files. Verify their status after installation.

## Workflow

1. Confirm that the local application server is working and record its URL.
2. Define the happy path, at least one relevant error state, and every affected responsive breakpoint.
3. Open the application in Chromium, exercise those flows, and inspect the rendered result directly.
4. Store any screenshots and temporary Playwright scripts in an operating-system temporary directory, never as versioned project assets. Remove them after inspection when they are no longer needed.
5. Log the URLs, flows, viewport sizes, screenshots inspected, and visual gaps found.
6. Use a browser MCP such as Playwright MCP only when the isolated Playwright workflow cannot perform the required interaction. Keep workflow behavior in this skill.

If Chromium is unavailable, approval is denied, or the local server does not work, report the exact gap and the command or prerequisite needed. Never claim or simulate visual validation.
