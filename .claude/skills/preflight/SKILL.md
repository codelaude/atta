---
name: preflight
description: Run full pre-PR validation combining lint checks, security scan, test execution, and code review into one workflow.
---

You are now running a **preflight check** - a comprehensive pre-PR validation that combines all quality checks into one workflow.

## Session Tracking Setup

Before starting execution, initialize session tracking.

**Step 1: Generate session identifiers**

Run these commands:
```bash
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
UUID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "no-uuid-$(date +%s)")
UUID=$(echo "$UUID" | tr '[:upper:]' '[:lower:]')
ISO_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
START_TIME=$(date +%s)
```

**Step 2: Create session file**

File: `{claudeDir}/.sessions/session-$TIMESTAMP.json`

Set `args` to the actual arguments the user passed, or `""` if none.

```json
{
  "schemaVersion": "1.0.0",
  "sessionId": "$UUID",
  "timestamp": "$ISO_TIME",
  "startedBy": "user",
  "skill": {
    "name": "preflight",
    "args": "{args-passed-by-user-or-empty-string}",
    "status": "in_progress"
  },
  "agents": [],
  "metadata": {
    "projectPath": "{current-working-directory}",
    "claudeDir": "{claudeDir}",
    "duration": null,
    "tokensUsed": null,
    "costUSD": null
  }
}
```

Record the session filename (`session-$TIMESTAMP.json`) and the `START_TIME` value — you will need both at the end.

---

## How to Use

```
/preflight                    # Full preflight (lint + security + tests + review)
/preflight --skip-tests       # Skip test execution
/preflight --skip-lint        # Skip lint checks
/preflight --skip-security    # Skip security scan
/preflight --skip-review      # Skip code review
```

---

## What Preflight Does

Preflight runs these checks in sequence:

```
1. LINT CHECK
   Run pattern checks from knowledge base
   -> Critical issues block proceeding

2. SECURITY SCAN
   OWASP Top 10 pattern checks + secrets detection
   -> Critical security issues block proceeding

3. TEST EXECUTION
   npm test (with snapshot updates if applicable)
   -> Failures block proceeding

4. CODE REVIEW
   Comprehensive review of changed files (includes security review)
   -> Issues reported but don't block

5. SUMMARY
   Overall status and action items
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
- Framework-idiomatic component patterns (e.g., `defineComponent` for Vue, proper exports for React)
- `role="list"` on styled lists

**If critical issues found, report and block.**

**If lint passes, continue to Step 3.**

### Step 3: Security Scan

Run security pattern checks on all changed files:

**Critical security patterns (must pass):**
- No hardcoded secrets, API keys, or tokens in source code
- No `eval()` / `exec()` with user-controlled input
- No SQL string concatenation (use parameterized queries)
- No `v-html` / `dangerouslySetInnerHTML` with unsanitized user data
- No `innerHTML` assignment with user data
- No embedded private keys

**Also scan for (report but don't block):**
- Missing input validation on user-facing endpoints
- Missing CSRF protection on state-changing endpoints
- Overly permissive CORS configuration
- Sensitive data in URL parameters or logs
- Missing security headers

**If critical security issues found, report and block.**

**If security passes, continue to Step 4.**

### Step 4: Run Tests

```bash
npm test
```

**If tests fail, report and block.**

**If tests pass, continue to Step 5.**

### Step 5: Code Review

Run comprehensive review on changed files (same as `/review`).

**Report all findings but don't block.**

### Step 6: Generate Summary

```markdown
## Preflight Results

### Status: READY FOR PR / ISSUES FOUND / BLOCKED

| Check | Status | Details |
|-------|--------|---------|
| Lint | Passed | No critical issues |
| Security | Passed | No critical vulnerabilities |
| Tests | Passed | X tests, 0 failures |
| Review | X issues | See below |
```

---

## Skip Flags

### `--skip-tests`
Skip test execution.

### `--skip-lint`
Skip lint pattern checks.

### `--skip-security`
Skip security scan (not recommended for PRs touching auth, API, or user input).

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

### Track Agent Invocation

If you invoke an agent during the preflight process (e.g., pr-manager, librarian), update the session file. Run `date -u +%Y-%m-%dT%H:%M:%SZ` to get the current timestamp, then add to the `agents` array:

```json
{
  "name": "{agent-id}",
  "role": "{universal|coordinator|specialist}",
  "invokedAt": "{ISO-8601-UTC}",
  "status": "completed"
}
```

Derive the `role` from where the agent was resolved:
- `.claude/agents/{id}.md` (core) → `"universal"`
- `.claude/agents/coordinators/{id}.md` → `"coordinator"`
- `.claude/agents/specialists/{id}.md` → `"specialist"`

---

## Finalize Session

After execution completes (whether successful, failed, or interrupted), finalize the session file.

**Step 1: Calculate duration**

Run: `date +%s` to get the current Unix timestamp.

Compute: `(current_unix_timestamp - START_TIME) * 1000` = duration in milliseconds.

**Step 2: Update session file**

Edit `{claudeDir}/.sessions/session-$TIMESTAMP.json`:
- Change `skill.status` from `"in_progress"` to `"completed"` (or `"failed"` / `"interrupted"`)
- Set `metadata.duration` to elapsed milliseconds

**Step 3: Run cleanup and context generation**

```bash
.claude/scripts/session-cleanup.sh {claudeDir}
```

```bash
.claude/scripts/generate-context.sh {claudeDir}
```

---

## Related Skills

- `/lint` - Pattern checks only
- `/security-audit` - Deep security analysis (OWASP, deps, secrets)
- `/review` - Code review only (includes security checks)
- `/agent pr-manager` - PR description generation
- `/agent librarian` - Learning capture

---

## Error Handling & Recovery

> **Session note:** If a session file was created, always finalize it (Finalize Session above) before displaying recovery messages — set status to `"failed"` or `"interrupted"`.

### Cannot Resolve Changed Files

If base branch detection fails, show:

```markdown
⚠️ I couldn't determine changed files from the remote base branch.

Recovery options:
1. Run preflight on local diff only (`git diff --name-only`)
2. Provide explicit targets through `/lint` and `/review`
3. Fetch remotes, then rerun `/preflight`
```

### Lint Blocked

If critical lint rules fail, show:

```markdown
⚠️ Preflight stopped: critical lint violations found.

Recovery options:
1. Fix critical lint issues first, then rerun `/preflight`
2. Run `/lint <target>` to focus on one area at a time
3. Use `/review --quick <target>` for fast critical-only validation
```

### Security Blocked

If critical security issues found, show:

```markdown
⚠️ Preflight stopped: critical security vulnerabilities found.

Recovery options:
1. Fix critical security issues first, then rerun `/preflight`
2. Run `/security-audit <target>` to investigate specific files
3. Use `/security-audit --secrets` or `--dependencies` to focus on one area
```

### Tests Fail

If tests fail, show:

```markdown
⚠️ Preflight stopped: test execution failed.

Recovery options:
1. Fix failing tests and rerun `/preflight`
2. Isolate failures with your test runner command, then retry
3. If test infra is temporarily unstable, run `/preflight --skip-tests` and clearly note this risk in your PR
```

### Review Step Unavailable

If review tooling/context is missing, show:

```markdown
⚠️ Review step could not run with full context.

Recovery options:
1. Rerun `/init` to regenerate missing context
2. Execute `/review <target>` manually
3. Continue with lint+test result only and flag review as pending
```
