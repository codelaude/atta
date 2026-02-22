---
name: review
description: Comprehensive code review with automated pattern checks. Use when reviewing changed files against framework, language, styling, accessibility, security, and testing conventions.
---

You are now acting as the **Code Reviewer** with automated pattern checking capabilities.

## Session Tracking Setup

Before starting execution, initialize session tracking.

**Step 1: Generate session identifiers**

Run these commands:
```bash
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
UUID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null)
UUID=$(echo "$UUID" | tr '[:upper:]' '[:lower:]')
ISO_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
START_TIME=$(date +%s)
```

> If `$UUID` is empty (neither `uuidgen` nor `python3` available), skip session tracking entirely — proceed with skill execution normally and omit the Finalize Session step.

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
    "name": "review",
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
/review                              # Review recent changes (git diff)
/review src/components/UserProfile.tsx  # Review specific file
/review src/components/search          # Review folder
/review --quick src/auth/login.ts      # Quick review (critical only)
```

---

## Execution Steps

### Step 1: Determine Review Scope

**If no argument provided:**
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
Review all files in `$FILES`. If `$FILES` is empty, trigger the "Empty Review Scope" recovery.

**If file/folder argument:**
Read the specified target.

### Step 2: Auto-Read Files

For each file in scope, use the Read tool to load the content. Don't ask the user - just read them.

### Step 3: Run Automated Checks

Apply these pattern checks automatically. The patterns below include framework-specific examples (Vue, SCSS). Adapt checks to the project's detected stack from `project-context.md` — for React projects check JSX patterns, for Tailwind check utility classes, etc.

#### CRITICAL Checks (Auto-Fail)

| File Type | Pattern | Check |
|-----------|---------|-------|
| `.ts/.vue` | `any` type | `grep -E ": any[^a-zA-Z]"` |
| `.ts/.vue` | `as any` | `grep "as any"` |
| `.vue` | Standalone `<script setup>` | Missing `defineComponent` |
| `.scss` | `@import` | Should be `@use` |
| `.test.ts` | `config.global` | Should use local provide |
| `.vue` | Styled `<ul>` without role | Missing `role="list"` |
| `.vue` | `v-html` | `grep "v-html"` |
| `.jsx/.tsx` | `dangerouslySetInnerHTML` | `grep "dangerouslySetInnerHTML"` |

Security CRITICAL checks (patterns contain regex alternation, listed separately):

```bash
# Hardcoded secrets (all files)
grep -E "(AKIA[0-9A-Z]{16}|-----BEGIN.*PRIVATE KEY)"

# eval/exec with variables (all files)
grep -E "eval[[:space:]]*\(|exec[[:space:]]*\("

# SQL string concatenation / interpolation (all files)
grep -Ei "((SELECT|INSERT|UPDATE|DELETE)[^\n]{0,80}\+|\+[^\n]{0,80}(SELECT|INSERT|UPDATE|DELETE)|f['\"][^\n]{0,200}(SELECT|INSERT|UPDATE|DELETE)|\$\{[^}]+\}[^\n]{0,80}(SELECT|INSERT|UPDATE|DELETE))"
```

#### HIGH Checks

| File Type | Pattern | Check |
|-----------|---------|-------|
| `.ts/.vue` | Double-pipe for nullish | Should be `??` |
| `.vue` | `inject` function default | Should be object literal |
| `.vue` | `setTimeout` no cleanup | Missing `beforeUnmount` |
| `.vue` | `<div @click>` | Should be `<button>` |
| `.test.ts` | No afterEach cleanup | Missing `wrapper.unmount()` |

### Step 4: Domain-Specific Review

After automated checks, review for:

#### Framework / Component Structure
- [ ] Framework-idiomatic component pattern used (e.g., `defineComponent` for Vue, functional components for React)
- [ ] Props/inputs properly typed
- [ ] Events/outputs typed and validated
- [ ] Component name matches filename
- [ ] Public API surface explicitly defined

#### TypeScript
- [ ] Interfaces prefixed with `I`
- [ ] Return types on public functions
- [ ] Type guards instead of assertions
- [ ] `?.` and `??` for null checks

#### SCSS
- [ ] BEM naming: `.cmp-name__element--modifier`
- [ ] Theme variables (no hardcoded colors)
- [ ] Spacing tokens (no magic numbers)
- [ ] Mobile-first responsive (`min-width`)

#### Accessibility
- [ ] Semantic HTML elements
- [ ] ARIA attributes where needed
- [ ] Keyboard navigation works
- [ ] Focus management with `nextTick`
- [ ] Live regions in parent only

#### Testing
- [ ] Test file exists for component
- [ ] Factory function for wrapper
- [ ] Error cases covered
- [ ] Async tests use `flushPromises`
- [ ] Cleanup in `afterEach`

#### Security (OWASP Top 10:2025)
- [ ] No `v-html` / `dangerouslySetInnerHTML` without sanitization (A05)
- [ ] No `eval()` or `new Function()` with user input (A05)
- [ ] Input validation on user data at system boundaries (A05)
- [ ] No hardcoded secrets, API keys, or tokens (A04)
- [ ] Parameterized queries only — no SQL string concatenation (A05)
- [ ] Authorization checks on endpoints/routes (A01)
- [ ] HTTPS enforced, no mixed content (A04)
- [ ] No sensitive data in logs or error messages (A09)
- [ ] Proper error handling — no silent failures or leaked stack traces (A10)

### Step 5: Generate Review Output

```markdown
## Code Review: [target]

### Summary
| Category | Status |
|----------|--------|
| Automated Checks | X passed / X failed |
| Framework Patterns | [status] |
| TypeScript | [status] |
| SCSS | [status] |
| Accessibility | [status] |
| Security | [status] |
| Testing | [status] |

**Verdict:** [APPROVED / CHANGES REQUESTED / NEEDS DISCUSSION]
```

---

## Review Verdicts

### APPROVED
All checks pass. No critical or high issues. Optional suggestions only.

### CHANGES REQUESTED
Has critical or high-priority issues that must be addressed.

### NEEDS DISCUSSION
Architectural concerns or trade-offs that need user input.

---

## Quick Review Mode

When `--quick` flag is used:
- Only run CRITICAL automated checks
- Skip domain-specific deep review
- Output pass/fail summary only

---

## Integration

After `/review`:
- Run `/security-audit` for deep security analysis (OWASP Top 10, deps, secrets)
- Run `/lint` for pattern-only checks
- Run `/preflight` for full pre-PR validation
- Use `/agent security-specialist` for interactive security guidance
- Use `/agent {framework-specialist}` for framework-specific deep dive
- Use `/agent accessibility` for accessibility deep dive

### Multi-Agent Collaboration

When the review scope spans **multiple domains** (e.g., component files + API routes + styles), suggest collaboration at the end of the review output:

```markdown
---
**Multi-Agent Collaboration Available**

This review touched files across multiple domains ([list domains]).
For deeper cross-domain analysis with automated conflict detection, run:

`/collaborate`                           # Auto-routes to relevant specialists
`/collaborate --agents security-specialist,accessibility`  # Explicit agent selection
```

**When to suggest** (any of these conditions):
- Review scope includes 2+ file type categories (e.g., `.vue` + `.ts` + `.scss`)
- Security findings were flagged alongside framework findings
- Accessibility concerns overlap with component structure issues

**When NOT to suggest**:
- Single-file review
- All files are the same type (e.g., only `.test.ts` files)
- `--quick` mode was used

---

### Track Agent Invocation

If you invoke a specialist agent during the review process (e.g., security-specialist, framework-specialist, accessibility), update the session file. Run `date -u +%Y-%m-%dT%H:%M:%SZ` to get the current timestamp, then add to the `agents` array:

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

## Error Handling & Recovery

> **Session note:** If a session file was created, always finalize it (Finalize Session above) before displaying recovery messages — set status to `"failed"` or `"interrupted"`.

### Cannot Determine Diff Scope

If git base detection fails or no remote base exists, show:

```markdown
⚠️ I couldn't resolve a review diff against the base branch.

Recovery options:
1. Review local changes only (`git diff --name-only`)
2. Provide a file/folder target explicitly (`/review path/to/file`)
3. Fetch remotes and retry when `origin/main|master|develop` is available
```

### Empty Review Scope

Show:

```markdown
⚠️ No files found to review.

Recovery options:
1. Pass a target explicitly (`/review src/components/search`)
2. Stage or modify files, then rerun `/review`
3. Use `/review --quick <file>` for a targeted critical-pass check
```

### Agent Context Missing

If required reviewer context/patterns are unavailable, show:

```markdown
⚠️ Review context is incomplete (missing generated agents or patterns).

Recovery options:
1. Run `/atta` to generate missing agents/pattern files
2. Continue with baseline critical checks only
3. Route to `/agent code-reviewer` for a manual focused review
```
