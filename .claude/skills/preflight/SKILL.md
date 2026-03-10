---
name: preflight
description: Run full pre-PR validation combining lint checks, security scan, test execution, and code review into one workflow.
---

You are now running a **preflight check** - a comprehensive pre-PR validation that combines all quality checks into one workflow.

## How to Use

```
/preflight                    # Full preflight (lint + security + tests + review)
/preflight --auto-fix         # Run preflight, then fix lint/review failures one check at a time
/preflight --skip-tests       # Skip test execution
/preflight --skip-lint        # Skip lint checks
/preflight --skip-security    # Skip security scan
/preflight --skip-review      # Skip code review
```

---

## Auto-Fix Mode

When run with `--auto-fix`, preflight enters an iterative fix loop after identifying failures.

### What gets fixed
- **Lint failures** — whitespace, formatting, pattern violations
- **Review findings** — LOW and MEDIUM severity items with clear remediation (missing null checks, unused imports, obvious code quality issues)

### What does NOT get auto-fixed
- Test failures (too complex — diagnose and fix manually)
- CRITICAL or HIGH security findings (too risky — review and fix manually)
- CRITICAL review findings (require human judgement)

### Fix loop behavior

1. Run all preflight checks (same as normal mode)
2. If all pass → "Ready for PR" (same as normal)
3. If lint or review failures exist → for each failing check, one at a time:
   - Analyze the failure output
   - Propose specific fixes (file + line + change description)
   - **Wait for your approval before applying**
   - On approval: apply fixes, re-run that check only
   - Report result before moving to the next check
4. Track what was attempted each round — if a fix attempt didn't resolve an issue, do not retry the same approach
5. **Maximum 3 iterations** — if still failing after 3 rounds, report a "couldn't auto-fix" summary with remaining items and recommended manual actions
6. Never auto-commit, never auto-push — only file edits (always user-confirmed)

### Round reporting format

```markdown
## Auto-Fix Round 1

**Lint**: 2 issues found
  - auth.js:42 — trailing whitespace
  - utils.ts:17 — unused import `lodash`

Proposed fixes: Apply both?
> [awaiting approval]

[After approval]

Lint re-run: PASSED

**Review**: 1 LOW finding
  - parser.js:88 — missing null check before `.split()`

Proposed fix: Add null guard on line 88?
> [awaiting approval]
```

---

## Execution Steps

### Step 0: Load Scoped Directives

Read these files from `.claude/agents/memory/` if they exist (skip silently if absent):
- `directives-testing.md` — testing rules
- `directives-code-reviewer.md` — code review rules

Apply any directives found as additional constraints for the preflight checks.

### Step 1: Gather Changed Files

```bash
# Detect base branch dynamically: main, master, or develop (whichever exists)
if git rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
  FILES=$(git diff --name-only origin/main...HEAD)
elif git rev-parse --verify --quiet origin/master >/dev/null 2>&1; then
  FILES=$(git diff --name-only origin/master...HEAD)
elif git rev-parse --verify --quiet origin/develop >/dev/null 2>&1; then
  FILES=$(git diff --name-only origin/develop...HEAD)
else
  # No remote base found — fall back to uncommitted changes
  FILES=$(git diff --name-only)
fi
```

If `$FILES` is empty, also check unstaged changes:
```bash
FILES=$(git diff --name-only)
```
If still empty, trigger the "Cannot Resolve Changed Files" recovery.

### Step 1.5: Static Analysis (New Files Only)

Derive the new-file subset using the same base-branch range from Step 1 with `--diff-filter=A` (e.g., `git diff --diff-filter=A --name-only origin/main...HEAD`). Run these quick checks on new files before the full review:

**Unused imports** — scan for imported symbols not referenced in the file body:
- JS/TS: named (`import { X }`), default (`import X`), namespace (`import * as NS`), and aliased (`import { X as Y }`) — check the *bound identifier* (Y, not X) for usage after the import block
- Python: `from module import X`, `import module`, and aliased forms (`as Y`) — check the bound name
- When confident the import is unused, report as HIGH (signals unfinished refactoring). If unsure due to complex patterns (re-exports, side-effect imports), downgrade to MEDIUM or skip.

**Cross-file consistency** — for new files that reference values also found in existing files:
- URLs, version strings, config keys: verify they match the canonical source (e.g., `package.json`, central config)
- Directory paths or conventions: verify they match patterns already established in the codebase
- Counts or feature claims in user-facing strings: verify they match the actual generated/configured output

**Platform portability** — scan for common cross-platform footguns in JS/TS:
- `.split('/')` on file paths → prefer `path.basename()`, `path.parse()`, or other `path` APIs; use `path.posix` when handling git/repo-relative paths (which always use `/`)
- Unquoted variable interpolation in shell command strings → paths with spaces will break

**Shell script safety** — for `.sh` files with `set -euo pipefail`:
- `find <dir>` in a pipeline → aborts if dir doesn't exist; guard with `[ -d "$dir" ]` or `|| true`
- `grep` in a pipeline → aborts on zero matches; use `|| true` or `{ grep ... || true; }`

**Test coverage** — if the new-file subset includes a new module, command, or entry point:
- Check whether a corresponding test file exists or is being added in the same changeset
- Report as MEDIUM if missing — new modules without tests are a regression risk

Report as a separate **Static Analysis** row in the summary table (Step 6), using HIGH/MEDIUM severities for prioritization. Static analysis findings do **not** block preflight on their own (unlike Lint critical patterns or Security critical findings) — they are informational and feed into the overall status alongside Review findings. If there are no new files in the changeset, report "N/A — no new files" and move on.

### Step 2: Lint Check

Run pattern checks on all changed files:

**Critical patterns (must pass):**
- No `any` types in TypeScript
- No `as any` casts
- No `@import` in SCSS (use `@use`)
- No `config.global.provide` in tests
- Framework-idiomatic component patterns
- `role="list"` on styled lists

**If critical issues found, report and block.**

### Step 3: Security Scan

Run `/security-audit` on all changed files (full scan).

**If CRITICAL security issues are found, report and block.**
**If only HIGH-level issues are found, report them but do not block preflight.**

### Step 4: Run Tests

Use the same detection logic as `/test` — read `project-context.md` for the test command, or auto-detect the framework. Run the unit/integration test suite (not E2E — those are too slow for preflight).

```bash
# Example (actual command determined by detection):
npm test
```

**If tests fail, report and block.**

### Step 5: Code Review

Run `/review` on changed files, covering:
- Framework patterns, TypeScript, SCSS, accessibility
- Performance analysis (re-renders, expensive computations, bundle impact)
- Bug/logic review (edge cases, error handling, race conditions)

Categorize findings by severity (CRITICAL / HIGH / MEDIUM / LOW).
Report all findings but don't block unless CRITICAL issues are found.

### Step 6: Generate Summary

```markdown
## Preflight Results

### Status: READY FOR PR / ISSUES FOUND / BLOCKED

| Check | Status | Details |
|-------|--------|---------|
| Static Analysis | Passed | No issues in new files (or N/A if no new files) |
| Lint | Passed | No critical issues |
| Security | Passed | No critical vulnerabilities |
| Tests | Passed | X tests, 0 failures |
| Review | X critical, X high, X medium | See below |
```

---

## Flags

| Flag | Effect |
|------|--------|
| `--auto-fix` | After running checks, attempt to fix lint and review failures one check at a time (user confirms each fix) |
| `--skip-tests` | Skip test execution |
| `--skip-lint` | Skip lint pattern checks |
| `--skip-security` | Skip security scan (not recommended for PRs touching auth, API, or user input) |
| `--skip-review` | Skip comprehensive code review |

---

## Integration with Workflow

```
1. Make changes
2. /preflight              <- Validate before completing
3. Fix any issues
4. /ship                   <- Run completion workflow (tests, PR description, learnings)
5. PR description ready
```

When all checks pass (status READY FOR PR), include in your summary: "All checks passed. You can now run `/ship` to generate the PR description and finalize."

---

## Related Skills

- `/test` - Run tests standalone (with `--e2e`, `--coverage`, `--watch` flags)
- `/lint` - Pattern checks only
- `/security-audit` - Deep security analysis (OWASP, deps, secrets)
- `/review` - Code review only (framework, performance, bug/logic)
- `/ship` - Completion workflow (run after preflight passes)

---

## Error Handling & Recovery

### Cannot Resolve Changed Files

```markdown
Could not determine changed files from the remote base branch.

Recovery options:
1. Run preflight on local diff only (`git diff --name-only`)
2. Provide explicit targets through `/lint` and `/review`
3. Fetch remotes, then rerun `/preflight`
```

### Lint Blocked

```markdown
Preflight stopped: critical lint violations found.

Recovery options:
1. Fix critical lint issues first, then rerun `/preflight`
2. Run `/lint <target>` to focus on one area at a time
3. Use `/review --quick <target>` for fast critical-only validation
```

### Security Blocked

```markdown
Preflight stopped: critical security vulnerabilities found.

Recovery options:
1. Fix critical security issues first, then rerun `/preflight`
2. Run `/security-audit <target>` to investigate specific files
3. Use `/security-audit --secrets` or `--dependencies` to focus on one area
```

### Tests Fail

```markdown
Preflight stopped: test execution failed.

Recovery options:
1. Fix failing tests and rerun `/preflight`
2. Isolate failures with your test runner command, then retry
3. If test infra is temporarily unstable, run `/preflight --skip-tests` and note this risk in your PR
```

### Review Blocked

```markdown
Preflight stopped: critical code review findings found.

Recovery options:
1. Fix CRITICAL review findings first, then rerun `/preflight`
2. Run `/review <target>` to focus on specific files
3. Use `/review --quick <target>` for fast critical-only validation
```

### Auto-Fix Max Iterations Reached

```markdown
Auto-fix stopped after 3 rounds. Remaining issues require manual attention.

What was fixed:
- [list of successfully applied fixes]

Still failing:
- [check]: [finding] — [why it wasn't auto-fixable]

Recommended next steps:
1. Fix remaining issues manually
2. Rerun /preflight to verify
3. Use /review <target> for focused review on specific files
```

### Review Step Unavailable

```markdown
Review step could not run with full context.

Recovery options:
1. Rerun `/atta` to regenerate missing context
2. Execute `/review <target>` manually
3. Continue with lint+test result only and flag review as pending
```
