---
name: lint
description: Run code quality checks based on project patterns. Use when checking code against established Vue, TypeScript, SCSS, and testing conventions.
---

You are now running a **code lint check** based on the project's established patterns. This skill actively scans code against pattern rules.

## How to Use

```
/lint                           # Lint recent changes (git diff)
/lint src/components/modal      # Lint specific folder
/lint modal.vue                 # Lint specific file
```

## What This Skill Does

1. **Reads the target code** (file, folder, or recent git changes)
2. **Applies pattern rules** from `.claude/knowledge/` pattern files
3. **Reports violations** grouped by severity
4. **Suggests fixes** for each issue found

---

## Pattern Rules Applied

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

## Error Handling & Recovery

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
