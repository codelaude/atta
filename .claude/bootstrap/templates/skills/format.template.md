---
name: format
description: Format code using {{FORMATTER}}
---

You are running the project's code formatter.

## Commands

| Action | Command |
|--------|---------|
| Format (apply) | `{{FORMAT_COMMAND}}` |
| Format (check only) | `{{CHECK_COMMAND}}` |

## Steps

1. **Check formatting**: Execute `{{CHECK_COMMAND}}`
2. **Analyze results**:
   - Parse which files need formatting
   - Count total files checked vs files needing changes
   - Identify any files that can't be auto-formatted
3. **Report findings**:
   - Total files checked
   - Files needing formatting (with paths)
   - Whether auto-format can fix all issues

## Response Format

```markdown
## Format Results

**Status**: CLEAN / NEEDS FORMATTING
**Formatter**: {{FORMATTER}}
**Files checked**: X | **Files to format**: Y

### Files Needing Formatting
- `file_path` — [description of changes needed]

### Auto-Format Available
Run `{{FORMAT_COMMAND}}` to automatically format Y files.
```

## Important

- Do NOT auto-format without asking the user first
- Some formatting changes may affect code behavior (e.g., trailing commas, semicolons)
- If the formatter config is missing, note it and suggest a default configuration
