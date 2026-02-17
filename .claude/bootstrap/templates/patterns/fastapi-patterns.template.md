# FastAPI Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Request/Response
- Use Pydantic models for request and response schemas
- Define response models with `response_model` parameter
- Use path parameters for resource identification
- Use query parameters for filtering/pagination
- Use request body for creation/update payloads

### Async
- Use `async def` for I/O-bound endpoints
- Use async database drivers (asyncpg, motor, aioredis)
- Never use sync I/O in async endpoints (blocks event loop)
- Use `run_in_executor` for unavoidable sync operations

### Dependencies
- Use `Depends()` for dependency injection
- Create reusable dependencies for auth, DB sessions, etc.
- Use `yield` dependencies for setup/teardown (DB connections)
- Keep dependency chains shallow

### Validation
- Leverage Pydantic's built-in validation
- Use `Field()` for constraints (min, max, regex)
- Custom validators with `@field_validator`
- Return descriptive validation error messages

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| Sync I/O in async endpoints | Use async libraries or run_in_executor | CRITICAL |
| Missing response models | Define Pydantic response models | HIGH |
| Business logic in endpoints | Extract to service functions | HIGH |
| Missing input validation | Use Pydantic models and Field constraints | HIGH |

## See Also

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
