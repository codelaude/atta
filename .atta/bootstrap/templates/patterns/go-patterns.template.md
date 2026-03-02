# Go Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Go version: {{LANGUAGE_VERSION}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Error Handling
- Always check and handle errors (never ignore with `_`)
- Return errors, don't panic (except truly unrecoverable)
- Wrap errors with context: `fmt.Errorf("doing X: %w", err)`
- Use sentinel errors or custom error types for expected conditions
- Use `errors.Is()` and `errors.As()` for error checking

### Concurrency
- Use goroutines for concurrent operations
- Use channels for communication between goroutines
- Use `context.Context` for cancellation and timeouts
- Use `sync.WaitGroup` for waiting on goroutine completion
- Use `sync.Mutex` only when channels are impractical
- Avoid shared mutable state

### Code Organization
- Keep packages small and focused
- Use descriptive package names (no `utils`, `common`, `helpers`)
- Accept interfaces, return structs
- Keep interfaces small (1-3 methods)
- Use `defer` for cleanup operations

### Naming
- Use `camelCase` for unexported, `PascalCase` for exported
- Short variable names for short scopes
- Acronyms in CAPS: `HTTPHandler`, `XMLParser`
- Interface names: single method → method name + `er` (e.g., `Reader`)

### Testing
- Use table-driven tests for multiple cases
- Use `testdata/` directory for test fixtures
- Use `testing.T.Helper()` for test helpers
- Prefer `go test ./...` for running all tests

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| Ignoring errors (`_ = fn()`) | Check and handle all errors | CRITICAL |
| Shared memory without sync | Use channels or sync primitives | CRITICAL |
| Panic in library code | Return errors instead | HIGH |
| Large interfaces | Break into smaller interfaces | MEDIUM |
| `init()` with side effects | Use explicit initialization | MEDIUM |

## See Also

- [Go Documentation](https://go.dev/doc/)
- [Effective Go](https://go.dev/doc/effective_go)
- [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments)
