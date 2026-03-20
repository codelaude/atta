---
name: atta-preflight
description: Run full pre-PR validation combining static analysis, lint checks, security scan, test execution, and code review into one workflow. Does NOT fix issues automatically unless --auto-fix is passed. Does NOT replace individual skills (/atta-lint, /atta-review, /atta-security-audit) for focused checks.
disable-model-invocation: true
model: haiku
argument-hint: "[--auto-fix] [--skip-tests] [--skip-lint] [--skip-security] [--skip-review]"
---

You are now running a **preflight check** - a comprehensive pre-PR validation that combines static analysis, lint, security, tests, and code review into one workflow.

## How to Use

```
/atta-preflight                    # Full preflight (static analysis + lint + security + tests + review)
/atta-preflight --auto-fix         # Run preflight, then fix issues one check at a time
/atta-preflight --skip-tests       # Skip test execution
/atta-preflight --skip-lint        # Skip lint checks
/atta-preflight --skip-security    # Skip security scan
/atta-preflight --skip-review      # Skip code review
```

If `--auto-fix` is passed, read `references/auto-fix-protocol.md` and follow its instructions after running the checks below.

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
  FILES=$(git diff --name-only)
fi
```

If `$FILES` is empty, also check unstaged changes (`git diff --name-only`). If still empty, read `references/error-recovery.md` for the "Cannot Resolve Changed Files" recovery.

### Step 1.5: Static Analysis (New Files Only)

Reuse the same `origin/main`, `origin/master`, or `origin/develop` base branch resolved in Step 1. Check for newly added files: `git diff --diff-filter=A --name-only origin/{base}...HEAD` (substituting the same branch). When Step 1 fell back to local diffs, use `git diff --diff-filter=A --name-only` plus `git ls-files --others --exclude-standard` (untracked files). If any new files exist, read `references/static-analysis.md` and follow its instructions. If no new files, report "Static Analysis: N/A — no new files" and skip to Step 2.

### Step 2: Lint Check

> Skip if `--skip-lint` is passed.

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

> Skip if `--skip-security` is passed.

Run `/atta-security-audit` on all changed files (full scan).

**If CRITICAL security issues are found, report and block.**
**If only HIGH-level issues are found, report them but do not block preflight.**

### Step 4: Run Tests

> Skip if `--skip-tests` is passed.

Use the same detection logic as `/atta-test` — read `project-context.md` for the test command, or auto-detect the framework. Run the unit/integration test suite (not E2E).

**If tests fail, report and block.**

### Step 5: Code Review

> Skip if `--skip-review` is passed.

Run `/atta-review` on changed files, covering framework patterns, TypeScript, SCSS, accessibility, performance, and bug/logic review. Categorize findings by severity (CRITICAL / HIGH / MEDIUM / LOW). Report all but only block on CRITICAL.

### Step 6: Generate Summary

```markdown
## Preflight Results

### Status: READY FOR PR / ISSUES FOUND / BLOCKED

| Check | Status | Details |
|-------|--------|---------|
| Static Analysis | X high, X medium (or N/A — no new files) | New files analyzed |
| Lint | Passed | No critical issues |
| Security | Passed | No critical vulnerabilities |
| Tests | Passed | X tests, 0 failures |
| Review | X critical, X high, X medium | See below |
```

When all checks pass (status READY FOR PR): "All checks passed. You can now run `/atta-ship` to generate the PR description and finalize."

---

## Flags

| Flag | Effect |
|------|--------|
| `--auto-fix` | After running checks, attempt fixes one check at a time (see `references/auto-fix-protocol.md`) |
| `--skip-tests` | Skip test execution |
| `--skip-lint` | Skip lint pattern checks |
| `--skip-security` | Skip security scan (not recommended for PRs touching auth, API, or user input) |
| `--skip-review` | Skip comprehensive code review |

---

## Integration

```
1. Make changes
2. /atta-preflight              <- Validate before completing
3. Fix any issues
4. /atta-ship                   <- Run completion workflow (tests, PR description, learnings)
5. PR description ready
```

---

## Error Handling

For detailed error recovery steps, read `references/error-recovery.md`.

---

## Related Skills

- `/atta-test` - Run tests standalone (with `--e2e`, `--coverage`, `--watch` flags)
- `/atta-lint` - Pattern checks only
- `/atta-security-audit` - Deep security analysis (OWASP, deps, secrets)
- `/atta-review` - Code review only (framework, performance, bug/logic)
- `/atta-ship` - Completion workflow (run after preflight passes)
