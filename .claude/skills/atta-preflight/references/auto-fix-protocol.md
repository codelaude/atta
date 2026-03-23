# Auto-Fix Protocol

When run with `--auto-fix`, preflight enters an iterative fix loop after identifying issues.

## What gets fixed
- **Static analysis findings** — unused imports, inconsistent values (missing test files are flagged but not auto-authored)
- **Lint failures** — whitespace, formatting, pattern violations
- **Review findings** — LOW and MEDIUM severity items with clear remediation (missing null checks, obvious code quality issues)

## What does NOT get auto-fixed
- Test failures (too complex — diagnose and fix manually)
- CRITICAL or HIGH security findings (too risky — review and fix manually)
- CRITICAL review findings (require human judgement)

## Fix loop behavior

1. Run all preflight checks (same as normal mode)
2. If all pass -> "Ready for PR" (same as normal)
3. If static analysis findings, lint failures, or review findings exist -> for each check with issues, one at a time:
   - Analyze the check output
   - Propose specific fixes (file + line + change description)
   - **Wait for your approval before applying**
   - On approval: apply fixes, re-run that check only
   - Report result before moving to the next check
4. Track what was attempted each round — if a fix attempt didn't resolve an issue, do not retry the same approach
5. **Maximum 3 iterations** — if still failing after 3 rounds, report a "couldn't auto-fix" summary with remaining items and recommended manual actions
6. Never auto-commit, never auto-push — only file edits (always user-confirmed)

## Round reporting format

```markdown
## Auto-Fix Round 1

**Static Analysis**: 1 issue found
  - utils.ts:3 — unused import `lodash` (HIGH)

Proposed fix: Remove unused import?
> [awaiting approval]

[After approval]

Static Analysis re-run: PASSED

**Lint**: 1 issue found
  - auth.js:42 — trailing whitespace

Proposed fix: Remove trailing whitespace?
> [awaiting approval]

[After approval]

Lint re-run: PASSED

**Review**: 1 LOW finding
  - parser.js:88 — missing null check before `.split()`

Proposed fix: Add null guard on line 88?
> [awaiting approval]
```

## Max Iterations Reached

```markdown
Auto-fix stopped after 3 rounds. Remaining issues require manual attention.

What was fixed:
- [list of successfully applied fixes]

Still failing:
- [check]: [finding] — [why it wasn't auto-fixable]

Recommended next steps:
1. Fix remaining issues manually
2. Rerun /atta-preflight to verify
3. Use /atta-review <target> for focused review on specific files
```
