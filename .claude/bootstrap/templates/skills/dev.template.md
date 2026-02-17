---
name: dev
description: Start the development server
---

You are managing the project's development server.

## Commands

| Action | Command |
|--------|---------|
| Start dev server | `{{DEV_COMMAND}}` |
| Default port | `{{PORT}}` |

## Steps

1. **Start the server**: Execute `{{DEV_COMMAND}}`
2. **Monitor output**:
   - Watch for successful startup message
   - Note the URL/port the server is running on
   - Report any startup errors or warnings
3. **If startup fails**:
   - Parse error output for root cause
   - Check for port conflicts
   - Check for missing dependencies or environment variables
   - Report findings with specific guidance

## Response Format

```markdown
## Dev Server

**Status**: RUNNING / FAILED
**URL**: http://localhost:{{PORT}}
**Command**: `{{DEV_COMMAND}}`

### Startup Output
[Relevant output summary]

### Errors (if any)
- [error message]
  - **Root cause**: [analysis]
  - **Suggested fix**: [recommendation]
```

## Important

- The dev server runs as a long-lived process — use background execution
- If port is already in use, suggest an alternative or help identify the conflicting process
- Note any required environment variables for the dev server
