---
name: lint
description: Run code quality checks based on project patterns. Use when checking code against established framework, language, styling, and testing conventions.
---

You are now running a **code lint check** based on the project's established patterns. This skill actively scans code against pattern rules.

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
    "name": "lint",
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
/lint                           # Lint recent changes (git diff)
/lint src/components/search      # Lint specific folder
/lint src/auth/login.ts         # Lint specific file
```

## What This Skill Does

1. **Reads the target code** (file, folder, or recent git changes)
2. **Applies pattern rules** from `.claude/knowledge/` pattern files
3. **Reports violations** grouped by severity
4. **Suggests fixes** for each issue found

---

## Pattern Rules Applied

> The patterns below include framework-specific examples (Vue, SCSS). Adapt checks to the project's detected stack from `project-context.md`.

### CRITICAL (Must Fix)

| Pattern | Check |
|---------|-------|
| TypeScript `any` | No `any` types anywhere |
| TypeScript `as any` | Use `as Partial<T> as T` instead |
| Vue `<script setup>` alone | Must wrap in `defineComponent` |
| SCSS `@import` | Must use `@use` with alias |
| Test `config.global.provide` | Must use local `provide` in mount() |
| A11y styled `<ul>` | Must have `role="list"` |
| A11y live region in child | Must be in parent component |

### HIGH (Should Fix)

| Pattern | Check |
|---------|-------|
| `\|\|` for nullish | Use `??` instead |
| `inject: { default: () => ({}) }` | Use `default: {}` |
| `setTimeout` without cleanup | Add `beforeUnmount` cleanup |
| Focus without `nextTick` | Add `await nextTick()` |
| `<div @click>` | Change to `<button>` |
| Test `mount()` without cleanup | Add `afterEach` unmount |
| Hardcoded colors | Use theme variables |

### MEDIUM (Consider Fixing)

| Pattern | Check |
|---------|-------|
| Interface without `I` prefix | Rename to `IInterfaceName` |
| kebab-case prop in template | Use camelCase everywhere |
| Test without `attachTo` for focus | Add `attachTo: document.body` |
| Hardcoded spacing | Use spacing tokens |
| Non-BEM class names | Use `.cmp-block__element--modifier` |

---

## Execution Steps

When invoked, follow these steps:

### Step 1: Determine Target
- If no argument: Run `git diff --name-only` to get changed files
- If folder argument: Get all relevant source files in folder
- If file argument: Use that specific file

### Step 2: Read Code
- Read each target file using the Read tool
- Focus on the file types relevant to the checks

### Step 3: Apply Pattern Checks
For each file, check against the rules above based on file type.

### Step 4: Report Results

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

### No Target Files Found

Show:

```markdown
⚠️ No files matched the lint target.

Recovery options:
1. Specify a file or folder explicitly (for example: `/lint src/components`)
2. Ensure there are changed files in git (`git diff --name-only`)
3. Run `/init --rescan` if project paths recently changed
```

### Pattern Files Missing

Show:

```markdown
⚠️ Pattern knowledge files are missing or incomplete.

Recovery options:
1. Run `/init` (or `/init --rescan`) to regenerate pattern files
2. Continue with core lint checks only (critical rules)
3. Add missing project context in `.claude/knowledge/project/project-context.md`
```

Format output as:

```markdown
## Lint Results: [target]

### Summary
- Critical: X issues
- High: X issues
- Medium: X issues

### Critical Issues

#### [filename.ext:line]
**Issue:** [description]
**Rule:** [pattern reference]
**Fix:** [suggested fix]

### High Issues
[Same format]

### Medium Issues
[Same format]

### Passed Checks
[List of checks that passed]
```

---

## Integration with Other Skills

After running `/lint`:
- Use `/review` for comprehensive code review
- Use `/preflight` to run full pre-PR checks
- Fix issues before running tests
