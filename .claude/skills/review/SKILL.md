---
name: review
description: Comprehensive code review with automated pattern checks. Use when reviewing changed files against Vue, TypeScript, SCSS, accessibility, and testing conventions.
---

You are now acting as the **Code Reviewer** with automated pattern checking capabilities.

## How to Use

```
/review                              # Review recent changes (git diff)
/review modal.vue                    # Review specific file
/review src/components/search        # Review folder
/review --quick modal.vue            # Quick review (critical only)
```

---

## Execution Steps

### Step 1: Determine Review Scope

**If no argument provided:**
```bash
# Detect base branch dynamically: main, master, or develop (whichever exists)
if git rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
  BASE=main
elif git rev-parse --verify --quiet origin/master >/dev/null 2>&1; then
  BASE=master
else
  BASE=develop
fi
git diff --name-only origin/$BASE...HEAD
```
Review all changed files.

**If file/folder argument:**
Read the specified target.

### Step 2: Auto-Read Files

For each file in scope, use the Read tool to load the content. Don't ask the user - just read them.

### Step 3: Run Automated Checks

Apply these pattern checks automatically:

#### CRITICAL Checks (Auto-Fail)

| File Type | Pattern | Check |
|-----------|---------|-------|
| `.ts/.vue` | `any` type | `grep -E ": any[^a-zA-Z]"` |
| `.ts/.vue` | `as any` | `grep "as any"` |
| `.vue` | Standalone `<script setup>` | Missing `defineComponent` |
| `.scss` | `@import` | Should be `@use` |
| `.test.ts` | `config.global` | Should use local provide |
| `.vue` | Styled `<ul>` without role | Missing `role="list"` |

#### HIGH Checks

| File Type | Pattern | Check |
|-----------|---------|-------|
| `.ts/.vue` | `\|\|` for nullish | Should be `??` |
| `.vue` | `inject` function default | Should be object literal |
| `.vue` | `setTimeout` no cleanup | Missing `beforeUnmount` |
| `.vue` | `<div @click>` | Should be `<button>` |
| `.test.ts` | No afterEach cleanup | Missing `wrapper.unmount()` |

### Step 4: Domain-Specific Review

After automated checks, review for:

#### Vue/Component Structure
- [ ] `defineComponent` + `setup()` pattern used
- [ ] Props typed with `PropType<T>`
- [ ] Emits typed and validated
- [ ] Component name matches filename
- [ ] `expose()` used if parent needs access

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

#### Security
- [ ] No `v-html` without sanitization
- [ ] No `eval()` or `new Function()`
- [ ] Input validation on user data

### Step 5: Generate Review Output

```markdown
## Code Review: [target]

### Summary
| Category | Status |
|----------|--------|
| Automated Checks | X passed / X failed |
| Vue Patterns | [status] |
| TypeScript | [status] |
| SCSS | [status] |
| Accessibility | [status] |
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
- Run `/lint` for pattern-only checks
- Run `/preflight` for full pre-PR validation
- Use `/agent vue` for Vue-specific deep dive
- Use `/agent accessibility` for accessibility deep dive
