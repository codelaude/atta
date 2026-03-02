---
name: lint
description: Run {{LINTER}} checks on the project
---

You are running the project's linter.

## Commands

| Action | Command |
|--------|---------|
| Lint (check) | `{{LINT_COMMAND}}` |
| Lint (auto-fix) | `{{FIX_COMMAND}}` |

## Steps

1. **Run the linter**: Execute `{{LINT_COMMAND}}`
2. **Analyze results**:
   - Parse warnings and errors by file
   - Group by rule/category
   - Identify auto-fixable vs manual-fix issues
3. **Report findings**:
   - Total issues count (errors vs warnings)
   - Issues grouped by file
   - Which issues are auto-fixable

## Response Format

```markdown
## Lint Results

**Status**: CLEAN / HAS ISSUES
**Linter**: {{LINTER}}
**Errors**: X | **Warnings**: Y | **Auto-fixable**: Z

### Issues by File
**`file_path`** (X issues)
- Line Y: [rule-name] — [message] (error/warning) {{auto-fixable}}
- Line Z: [rule-name] — [message] (error/warning)

### Auto-Fix Available
Run `{{FIX_COMMAND}}` to automatically fix Z issues.
```

## Important

- Do NOT auto-fix without asking the user first
- Distinguish between errors (must fix) and warnings (should fix)
- If the linter config is missing, note it and suggest a default configuration
