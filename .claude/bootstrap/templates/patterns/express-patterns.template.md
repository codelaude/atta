# Express.js Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Middleware
- Use middleware for cross-cutting concerns (auth, logging, CORS)
- Order matters — register error handler last
- Use `Router` for route grouping
- Async handlers must catch errors (use wrapper or express-async-errors)

### Error Handling
- Centralized error-handling middleware
- Never swallow errors silently
- Return consistent error response format
- Log errors with context (request ID, user, path)

### Security
- Use `helmet` for security headers
- Validate and sanitize all user input
- Use parameterized queries (prevent SQL injection)
- Rate limiting on public endpoints
- CORS configuration for allowed origins

### Structure
- Separate routes, controllers, and services
- Use environment variables for configuration
- Keep controllers thin — business logic in services
- Use dependency injection for testability

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| Sync operations blocking event loop | Use async operations | CRITICAL |
| Unhandled promise rejections | Use try-catch or error middleware | CRITICAL |
| Business logic in routes | Move to service layer | HIGH |
| Hardcoded config values | Use environment variables | HIGH |

## See Also

- [Express.js Documentation](https://expressjs.com/)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
