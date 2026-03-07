---
name: build
description: Build the project using {{BUILD_TOOL}}
---

You are running the project's build process.

## Commands

| Action | Command |
|--------|---------|
| Build | `{{BUILD_COMMAND}}` |
| Output directory | `{{OUTPUT_DIR}}` |

## Steps

1. **Run the build**: Execute `{{BUILD_COMMAND}}`
2. **Analyze results**:
   - If successful: report build output, file sizes, any warnings
   - If failed: read error messages, identify the root cause
3. **If build fails**:
   - Parse the error output for file paths and line numbers
   - Read the failing source files
   - Identify the issue (type error, missing import, syntax error, etc.)
   - Report findings with specific locations
4. **If build succeeds with warnings**: Report warnings and assess severity

## Response Format

```markdown
## Build Results

**Status**: SUCCESS / FAILED
**Output**: `{{OUTPUT_DIR}}/`
**Duration**: Xs (if available)

### Errors (if any)
- `file_path:line` — [error message]
  - **Root cause**: [analysis]
  - **Suggested fix**: [recommendation]

### Warnings (if any)
- `file_path:line` — [warning message]
  - **Severity**: LOW / MEDIUM / HIGH
```

## Important

- Do NOT fix build errors automatically — report findings and let the user decide
- Note if the build requires environment variables or configuration
- If the build tool is not installed, suggest the installation command
