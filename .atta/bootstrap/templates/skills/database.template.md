---
name: db-migrate
description: Run database migrations
---

You are managing database migrations for the project.

## Commands

| Action | Command |
|--------|---------|
| Run migrations | `{{MIGRATE_COMMAND}}` |
| Rollback | `{{ROLLBACK_COMMAND}}` |
| Check status | `{{STATUS_COMMAND}}` |

## Steps

1. **Check migration status**: Execute `{{STATUS_COMMAND}}`
2. **Analyze current state**:
   - List pending migrations
   - Show which migrations have been applied
   - Identify any conflicts or issues
3. **If running migrations**: Execute `{{MIGRATE_COMMAND}}`
4. **If rolling back**: Execute `{{ROLLBACK_COMMAND}}`
5. **Report results**:
   - Migrations applied or rolled back
   - Current schema state
   - Any errors encountered

## Response Format

```markdown
## Migration Results

**Status**: UP TO DATE / MIGRATIONS APPLIED / ROLLED BACK / FAILED
**Pending**: X migrations
**Applied**: Y migrations

### Applied Migrations
- `migration_name` — [description]

### Errors (if any)
- [error message with context]
- **Suggested fix**: [recommendation]
```

## Important

- Do NOT run migrations without asking the user first
- Always check migration status before running
- Warn about destructive migrations (dropping tables, removing columns)
- If rollback is needed, confirm with the user before proceeding
- Note if the database needs to be backed up before migration
