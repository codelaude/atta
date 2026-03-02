---
name: preflight
description: Run full pre-PR validation combining lint checks, security scan, test execution, and code review into one workflow.
---

You are now running a **preflight check** - a comprehensive pre-PR validation that combines all quality checks into one workflow.

## How to Use

```
/preflight                    # Full preflight (lint + security + tests + review)
/preflight --skip-tests       # Skip test execution
/preflight --skip-lint        # Skip lint checks
/preflight --skip-security    # Skip security scan
/preflight --skip-review      # Skip code review
```

---

## Execution Steps

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
| Lint | Passed | No critical issues |
| Security | Passed | No critical vulnerabilities |
| Tests | Passed | X tests, 0 failures |
| Review | X critical, X high, X medium | See below |
```

---

## Skip Flags

| Flag | Effect |
|------|--------|
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

### Review Step Unavailable

```markdown
Review step could not run with full context.

Recovery options:
1. Rerun `/atta` to regenerate missing context
2. Execute `/review <target>` manually
3. Continue with lint+test result only and flag review as pending
```
