# Testing Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Testing framework: {{TESTING_NAME}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Test Structure
- One assertion concept per test (single responsibility)
- Descriptive test names: `should [expected behavior] when [condition]`
- Group related tests with `describe` blocks
- Follow Arrange-Act-Assert pattern
- Keep tests independent — no shared mutable state

### Setup and Cleanup
- Use `beforeEach` / `afterEach` for test isolation
- Clean up DOM, timers, and subscriptions in `afterEach`
- Use factory functions for test data (avoid shared fixtures)
- Reset mocks between tests
- Unmount components to prevent memory leaks

### Mocking
- Mock external dependencies (APIs, services, modules)
- Avoid mocking internal implementation details
- Use `jest.fn()` / `vi.fn()` for function mocks
- Restore mocks after each test (`jest.restoreAllMocks()`)
- Prefer dependency injection over module mocking

### Assertions
- Test behavior and outputs, not implementation details
- Use specific matchers (`toHaveBeenCalledWith` over `toHaveBeenCalled`)
- Test error cases as thoroughly as success cases
- Assert on user-visible outcomes (DOM, events, return values)
- Avoid snapshot tests for dynamic content

### Async Testing
- Always `await` async operations
- Use `flushPromises()` for Vue, `waitFor()` for React
- Set reasonable timeouts for async operations
- Test loading, success, and error states
- Mock timers for timeout-dependent code

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| Testing implementation details | Test behavior and outputs instead | MEDIUM |
| No cleanup in afterEach | Add `wrapper.unmount()` and mock restore | HIGH |
| Shared mutable state between tests | Use factory functions and beforeEach | CRITICAL |
| Missing error case tests | Add tests for failure paths | HIGH |
| Snapshot tests for dynamic content | Use specific assertions | MEDIUM |
| `config.global` for component mounts | Use local provide/inject per test | HIGH |
| No async handling | Use await, flushPromises, or waitFor | CRITICAL |

## Test Organization

```
tests/
├── unit/           # Component and function unit tests
├── integration/    # Multi-component and API integration tests
└── e2e/            # End-to-end user flow tests (if applicable)
```

## Coverage Guidelines

- Aim for meaningful coverage, not 100%
- Prioritize: critical paths > edge cases > happy paths
- Cover error handling and boundary conditions
- Skip trivial getters/setters and pure pass-through code

## See Also

{{#if IS_JEST}}
- [Jest Documentation](https://jestjs.io/docs/)
{{/if}}
{{#if IS_PYTEST}}
- [pytest Documentation](https://docs.pytest.org/)
{{/if}}
- [Testing Library](https://testing-library.com/)
