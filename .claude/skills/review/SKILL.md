---
name: review
description: Comprehensive code review with automated pattern checks. Use when reviewing changed files against Vue, TypeScript, SCSS, accessibility, security, and testing conventions.
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
| `.vue` | `v-html` | `grep "v-html"` |
| `.jsx/.tsx` | `dangerouslySetInnerHTML` | `grep "dangerouslySetInnerHTML"` |

Security CRITICAL checks (patterns contain regex alternation, listed separately):

```bash
# Hardcoded secrets (all files)
grep -E "(AKIA[0-9A-Z]{16}|-----BEGIN.*PRIVATE KEY)"

# eval/exec with variables (all files)
grep -E "eval\s*\(|exec\s*\("

# SQL string concatenation (all files)
grep -E "(\+\s*['\"].*SELECT|f['\"].*SELECT|\$\{.*SELECT)"
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
| Vue Patterns | [status] |
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
- Use `/agent vue` for Vue-specific deep dive
- Use `/agent accessibility` for accessibility deep dive

---

## Error Handling & Recovery

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
1. Run `/init` to generate missing agents/pattern files
2. Continue with baseline critical checks only
3. Route to `/agent code-reviewer` for a manual focused review
```
