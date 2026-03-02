# Database Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Database: {{DATABASE_NAME}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Query Safety
- Always use parameterized queries (never string concatenation)
- Validate and sanitize all user input before queries
- Use least-privilege database accounts
- Log slow queries for monitoring (> {{SLOW_QUERY_THRESHOLD|default:100}}ms)

### Schema Design
- Use appropriate data types (don't store numbers as strings)
- Define constraints: NOT NULL, UNIQUE, FOREIGN KEY, CHECK
- Add indexes on foreign keys and frequently queried columns
- Use meaningful column and table names
- Plan for data growth and query patterns

### Performance
- SELECT specific columns (avoid SELECT *)
- Use JOINs instead of N+1 queries
- Limit result sets with WHERE clauses and pagination
- Use EXPLAIN/EXPLAIN ANALYZE for slow query diagnosis
- Consider query plan and index usage

### Transactions
- Use transactions for multi-step atomic operations
- Keep transactions short to reduce lock contention
- Handle deadlocks with retry logic
- Use appropriate isolation levels

### Migrations
- Every schema change must have a migration script
- Include both forward (up) and rollback (down) scripts
- Make migrations backwards compatible when possible
- Test migrations on copy of production data
- Verify rollback works before deploying

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| String concatenation in queries | Use parameterized queries | CRITICAL |
| SELECT * in production code | Select specific columns | HIGH |
| Missing indexes on FK columns | Add indexes | HIGH |
| N+1 query pattern | Use JOINs or batch queries | HIGH |
| No transaction for multi-step ops | Wrap in transaction | HIGH |
| Functions in WHERE clause | Restructure to allow index usage | MEDIUM |
| Missing migration rollback | Add down migration | MEDIUM |

## Connection Management
- Use connection pooling (don't open/close per query)
- Set appropriate pool size for workload
- Configure connection timeouts
- Handle connection failures gracefully
- Monitor pool utilization

## See Also

{{#if IS_SQL}}
- Database-specific documentation for {{DATABASE_NAME}}
{{/if}}
{{#if IS_NOSQL}}
- {{DATABASE_NAME}} documentation for schema design patterns
{{/if}}
