---
name: preflight
description: Run full pre-PR validation combining lint checks, test execution, and code review into one workflow.
---

You are now running a **preflight check** - a comprehensive pre-PR validation that combines all quality checks into one workflow.

## How to Use

```
/preflight                    # Full preflight (lint + tests + review)
/preflight --skip-tests       # Skip test execution
/preflight --skip-lint        # Skip lint checks
/preflight --skip-review      # Skip code review
```

---

## What Preflight Does

Preflight runs these checks in sequence:

```
1. LINT CHECK
   Run pattern checks from knowledge base
   -> Critical issues block proceeding

2. TEST EXECUTION
   npm test (with snapshot updates if applicable)
   -> Failures block proceeding

3. CODE REVIEW
   Comprehensive review of changed files
   -> Issues reported but don't block

4. SUMMARY
   Overall status and action items
```

---

## Execution Steps

### Step 1: Gather Changed Files

```bash
git diff --name-only origin/develop...HEAD
```

If no changes found, check unstaged changes:
```bash
git diff --name-only
```

### Step 2: Lint Check

Run pattern checks on all changed files:

**Critical patterns (must pass):**
- No `any` types in TypeScript
- No `as any` casts
- No `@import` in SCSS (use `@use`)
- No `config.global.provide` in tests
- `defineComponent` wrapper for Vue components
- `role="list"` on styled lists

**If critical issues found, report and block.**

**If lint passes, continue to Step 3.**

### Step 3: Run Tests

```bash
npm test
```

**If tests fail, report and block.**

**If tests pass, continue to Step 4.**

### Step 4: Code Review

Run comprehensive review on changed files (same as `/review`).

**Report all findings but don't block.**

### Step 5: Generate Summary

```markdown
## Preflight Results

### Status: READY FOR PR / ISSUES FOUND / BLOCKED

| Check | Status | Details |
|-------|--------|---------|
| Lint | Passed | No critical issues |
| Tests | Passed | X tests, 0 failures |
| Review | X issues | See below |
```

---

## Skip Flags

### `--skip-tests`
Skip test execution.

### `--skip-lint`
Skip lint pattern checks.

### `--skip-review`
Skip comprehensive code review.

---

## Integration with Workflow

```
1. Make changes
2. /preflight              <- Validate before completing
3. Fix any issues
4. "all is ok"             <- Triggers PR generation
5. PR description ready
```

Or manually:
```
1. /preflight
2. /agent pr-manager       <- Generate PR description
3. /agent librarian        <- Capture learnings
```

---

## Related Skills

- `/lint` - Pattern checks only
- `/review` - Code review only
- `/agent pr-manager` - PR description generation
- `/agent librarian` - Learning capture
