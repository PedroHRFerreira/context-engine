---
name: review
description: Use for PR, commit, or manual change review readiness checks.
---

# Review

## Checklist

1. Confirm the request, changed files, and intended behavior.
2. Compare manual-test paths against hardcoded or automated checks.
3. Prioritize bugs, regressions, missing validation, and missing tests.
4. Mark ready only when the smallest relevant validation has passed or the gap is explicit.
5. When `visual-check` screenshots or flow logs exist, compare them with the requirements, error states, responsive behavior, and known visual regressions before marking the change ready.

## Output

- Findings first, ordered by severity.
- File and line references when available.
- Keep summaries secondary to actionable issues.
