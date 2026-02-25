# E2E Testing Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> E2E framework: {{E2E_FRAMEWORK_NAME}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Test Scope
- E2E tests cover **critical user journeys** — not every feature
- A typical project needs 10-30 E2E tests, not hundreds
- Each E2E test must justify its maintenance cost
- Default to unit/integration tests; promote to E2E only when lower levels can't catch the bug

### Test Structure
- One user journey per test file
- Descriptive test names: `should complete checkout as logged-in user`
- Group related flows with `describe` blocks
- Keep tests independent — no shared state or execution order
- Each test starts from a clean state (fresh session, seeded data)

### Selectors (priority order)
1. **Test IDs**: `data-testid="submit-btn"` — most stable
2. **ARIA roles/labels**: `role="button"`, `aria-label="Submit"` — accessible + stable
3. **Semantic HTML**: `button`, `input[type="email"]` — stable if markup is semantic
4. **Text content**: `"Sign In"` — readable but fragile if copy changes
5. **Never use**: Auto-generated classes, XPath, nth-child, CSS module hashes

### Waiting Strategy
- Use framework auto-waiting — never use `sleep()` or fixed timeouts
- Wait for specific conditions: element visible, network idle, text appeared
- Mock or intercept API calls for deterministic timing
- Disable animations in test mode (CSS or config flag)

### Page Object Pattern
- One page object per page or major component
- Encapsulate selectors — raw selectors never appear in test files
- Methods return page objects for chaining
- Keep assertions in test files, not in page objects
- Use descriptive method names: `loginAs(user)` not `fillAndSubmit()`

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| Fixed `sleep()` / `waitForTimeout()` | Use auto-wait or explicit condition waits | CRITICAL |
| Raw selectors in test files | Encapsulate in page objects | HIGH |
| CSS class selectors (`.btn-primary`) | Use `data-testid` or ARIA roles | HIGH |
| Tests depending on execution order | Make each test independent with proper setup | CRITICAL |
| Shared mutable state between tests | Isolate test data per test | CRITICAL |
| Testing implementation details via E2E | Use unit tests for internals, E2E for user flows | MEDIUM |
| No cleanup after test | Seed and tear down test data per test | HIGH |
| Hardcoded URLs or credentials | Use config/env variables and test fixtures | HIGH |
| Catching all exceptions to hide flakiness | Fix root cause — retries are a band-aid | MEDIUM |
| E2E tests for form validation rules | Use unit tests for validation logic | MEDIUM |

## Test Organization

```
{{E2E_DIR}}/
├── pages/              # Page objects
{{#if EXT}}
│   ├── login.page.{{EXT}}
│   ├── dashboard.page.{{EXT}}
│   └── checkout.page.{{EXT}}
{{else}}
│   ├── login.page.<ext>
│   ├── dashboard.page.<ext>
│   └── checkout.page.<ext>
{{/if}}
├── fixtures/           # Test data and factories
│   ├── users.json
│   └── products.json
├── specs/              # Test files (one per journey)
{{#if EXT}}
│   ├── auth.spec.{{EXT}}
│   ├── checkout.spec.{{EXT}}
│   └── navigation.spec.{{EXT}}
{{else}}
│   ├── auth.spec.<ext>
│   ├── checkout.spec.<ext>
│   └── navigation.spec.<ext>
{{/if}}
└── support/            # Helpers and custom commands
{{#if EXT}}
    ├── commands.{{EXT}}
    └── selectors.{{EXT}}
{{else}}
    ├── commands.<ext>
    └── selectors.<ext>
{{/if}}
```

## What to E2E Test

### Always test
- Authentication flows (login, logout, password reset, session expiry)
- Critical business transactions (checkout, payment, order submission)
- Multi-step processes (wizards, onboarding, form sequences)
- Navigation and routing (deep links, redirects, 404 handling)
- Permission boundaries (admin vs user access)

### Consider testing
- Cross-browser rendering (critical pages only, on CI)
- Responsive breakpoints (key layouts, not every component)
- Third-party integrations (OAuth, payment, maps)
- Accessibility flows (keyboard navigation, screen reader paths)

### Never E2E test
- Individual component props/events (unit test)
- API response shapes (integration test)
- CSS styling details (visual regression tool)
- Every permutation of form inputs (unit test validation logic)
- Internal state management (unit test stores/reducers)

## Test Data Management

- **Factories**: Use builder patterns to create test data on demand
- **Isolation**: Each test seeds its own data — never rely on pre-existing state
- **Cleanup**: Delete test data after each test (or use isolated environments)
- **Realistic**: Use synthetic but realistic data (valid emails, phone formats)
- **No production data**: Never use real user data in tests
- **API seeding**: Prefer API calls to seed data (faster than UI interactions)

## Flakiness Prevention

| Cause | Prevention |
|-------|-----------|
| Network timing | Intercept/mock API calls; wait for specific responses |
| Animations | Disable via CSS `* { transition: none !important; }` or config flag |
| Race conditions | Wait for DOM state, not arbitrary timeouts |
| Viewport differences | Set explicit viewport in config |
| Third-party scripts | Block or mock external scripts in test env |
| Date/time sensitivity | Mock `Date.now()` or use frozen time |
| Database state | Seed fresh data per test, run in transactions |

## CI/CD Integration

- Run critical E2E subset on every PR (< 5 minutes)
- Run full E2E suite on merge to main/develop
- Parallelize tests across workers/containers
- Record artifacts on failure: screenshots, videos, traces
- Set per-test timeout (30-60s) and suite timeout (10-15 min)
- Retry flaky tests once in CI (but track and fix root causes)

## Coverage Guidelines

- E2E coverage is about **journey coverage**, not line coverage
- Maintain a coverage map: which user journeys have E2E tests
- Prioritize: revenue-critical paths > user-facing features > admin features
- Review coverage map quarterly — remove tests for deprecated features

## See Also

{{#if IS_CYPRESS}}
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Cypress Testing Library](https://testing-library.com/docs/cypress-testing-library/intro/)
{{/if}}
{{#if IS_PLAYWRIGHT}}
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Test Fixtures](https://playwright.dev/docs/test-fixtures)
{{/if}}
{{#if IS_PUPPETEER}}
- [Puppeteer Documentation](https://pptr.dev/)
{{/if}}
{{#if IS_SELENIUM}}
- [Selenium Best Practices](https://www.selenium.dev/documentation/test_practices/)
{{/if}}
{{#if IS_WEBDRIVERIO}}
- [WebdriverIO Best Practices](https://webdriver.io/docs/bestpractices)
{{/if}}
- [Testing Library](https://testing-library.com/)
