---
type: quick_reference
priority: critical
format: decision_tree
---

# Quick Reference - Decision Trees & Anti-Patterns

> **Purpose:** Fast lookups for common decisions and anti-patterns.
> **Setup:** This file will be populated by `/atta` based on your detected tech stack,  or you can add project-specific rules manually.
> **Note:** Tech-specific patterns (Vue, React, Django, etc.) belong in `.atta/knowledge/patterns/[tech]-patterns.md`

---

## When I See → Then I Do

> **Format:** `| I See | I Do | Severity |`
> **Severity Levels:** CRITICAL (breaks functionality), HIGH (major issue), MEDIUM (quality issue), LOW (style/preference)

### Example Anti-Patterns (Generic)

| I See | I Do | Severity |
|-------|------|----------|
| Hardcoded secrets in code | Move to environment variables | CRITICAL |
| No error handling | Add try/catch with logging | HIGH |
| Magic numbers | Extract to named constants | MEDIUM |
| Copy-pasted code | Extract to reusable function | MEDIUM |

_Add your project-specific anti-patterns here after `/atta` generates pattern files._

---

## Bug Fixing - Root Cause First

### Before Writing Code
```
1. "What's the simplest thing that SHOULD work?"
2. "Why doesn't it work?" → Investigate directly (logs, debugger, profiler)
3. Find the CAUSE, not the symptom
4. Remove code > Add code
```

### Red Flags (Stop & Re-evaluate)
- Adding complexity to "fix" a symptom
- Writing workarounds instead of fixing root cause
- Investigation log has 5+ failed attempts
- Calculating something the framework/browser should handle
- Third attempt at the same fix

---

## File Type → Required Reading

> **Purpose:** Know which pattern files to reference when editing specific file types.
> **Setup:** This table is auto-populated by `/atta` based on detected technologies.

| Editing | Read First |
|---------|------------|
| _Will be populated by /atta based on your tech stack_ | _Pattern files_ |

**Example (after init on a Vue + Django project):**
| Editing | Read First |
|---------|------------|
| `*.vue` | vue-patterns.md, accessibility-patterns.md |
| `*.py` | python-patterns.md, django-patterns.md |
| `*.test.ts` | testing-patterns.md, typescript-patterns.md |
| `*.scss` | scss-patterns.md |
| Any UI/UX | accessibility-patterns.md |

---

## Pre-Commit Checklist

> **Purpose:** Quick verification before committing code.
> **Setup:** Customize this list based on your project's requirements.

### Universal Checks
- [ ] No hardcoded secrets or API keys
- [ ] No commented-out code (remove or document why)
- [ ] No `console.log` / `print` debugging statements (use proper logging)
- [ ] Error handling added where needed
- [ ] Tests pass locally
- [ ] Linter passes

### Tech-Specific Checks
_This section will be populated by `/atta` based on your stack._

---

## Code Smell Patterns

> **Purpose:** Common patterns that indicate potential problems.
> **Note:** Add project-specific code smells as you discover them.

### Memory Leaks
- Event listeners not cleaned up
- Timers (setTimeout/setInterval) without cleanup
- Subscriptions not unsubscribed
- Large objects held in closures

### Performance Issues
- Unnecessary re-renders/re-calculations
- Unindexed database queries
- N+1 query problems
- Loading entire datasets instead of paginating

### Security Issues
- SQL injection vulnerabilities (string concatenation in queries)
- XSS vulnerabilities (unescaped user input)
- Missing input validation
- Exposing sensitive data in logs

### Maintainability Issues
- Functions longer than 50 lines
- Deep nesting (>3 levels)
- Unclear variable names (`x`, `temp`, `data`)
- Missing documentation for complex logic

---

## Decision Trees

### New Feature?
```
1. Check existing codebase → Can I reuse/extend existing code?
2. No → Check design patterns → Which pattern fits?
3. Design first → Sketch API/interface before implementing
4. Write tests → Define expected behavior
5. Implement → Small, focused commits
6. Refactor → Clean up before PR
```

### Performance Issue?
```
1. Profile first → Measure, don't guess
2. Identify bottleneck → What's actually slow?
3. Check low-hanging fruit:
   - Database queries (indexes, N+1)
   - Unnecessary computations
   - Large payloads
   - Unoptimized assets
4. Optimize the bottleneck
5. Measure again → Verify improvement
```

### Debugging Strategy?
```
1. Reproduce → Can I trigger it reliably?
2. Isolate → Narrow down to smallest failing case
3. Hypothesize → What could cause this?
4. Test hypothesis → Add logs, breakpoints, tests
5. Fix → Minimal change to address root cause
6. Verify → Ensure bug is fixed, no regressions
7. Add test → Prevent future regression
```

---

## Integration with Pattern Files

**Pattern files** (`.atta/knowledge/patterns/[tech]-patterns.md`) contain:
- Language/framework-specific best practices
- Detailed code examples
- Anti-patterns with fixes
- Testing strategies
- Common gotchas

**This file** (quick-reference.md) contains:
- Cross-cutting concerns (security, performance, maintainability)
- High-level decision trees
- Project-specific shortcuts
- "When I see X, do Y" lookup tables

**When in doubt:**
- Check pattern files for "how to implement correctly"
- Check this file for "what to check before committing"

---

## Customization

After running `/atta`, this file will be enhanced with:
1. Tech-specific anti-patterns from your detected stack
2. File type → pattern file mappings
3. Pre-commit checklist items based on your tooling

You can always add project-specific rules manually by editing this file.
