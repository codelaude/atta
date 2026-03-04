# Project Profile & Team Conventions

> **Purpose:** Shared team standards and project conventions for AI-assisted development.
> **Committed to repo** — applies to all team members and CI code review.
> **Setup:** Fill in during `/atta` or edit anytime. Personal AI preferences go in `developer-profile.md` (gitignored).

---

## Code Review Priorities

_What should AI focus on during code review?_
- [ ] Correctness and bugs
- [ ] Performance and optimization
- [ ] Readability and maintainability
- [ ] Security vulnerabilities
- [ ] Accessibility compliance
- [ ] Test coverage

---

## Testing Approach

- [ ] TDD (tests first, then implementation)
- [ ] Test-after (implement, then test)
- [ ] Critical paths only
- [ ] High coverage preferred (80%+)

---

## PR Workflow

- [ ] Generate PR descriptions as markdown code blocks
- [ ] Include pre-validation checklist in PR
- [ ] Auto-run tests before PR creation
- [ ] Keep PRs minimal (small, focused changes)

---

## Documentation

- [ ] Inline comments for complex logic
- [ ] JSDoc/docstrings for all public APIs
- [ ] README files for each major module
- [ ] Minimal comments (code should be self-documenting)

---

## Error Handling

- [ ] Defensive (validate all inputs, fail gracefully)
- [ ] Fast-fail (throw early, catch at boundaries)
- [ ] User-friendly (show user-facing error messages)
- [ ] Developer-friendly (detailed errors in console/logs)

---

## Naming Conventions

_Project-specific naming standards:_
- Functions: `[camelCase / snake_case / PascalCase]`
- Variables: `[camelCase / snake_case]`
- Constants: `[UPPER_SNAKE_CASE / camelCase]`
- Interfaces/Types: `[IInterface / Interface / TInterface]`
- CSS Classes: `[kebab-case / camelCase / BEM]`

---

## Tech Stack Preferences

_Project-specific patterns and conventions for AI to follow:_

**Example:**
- "Always use async/await, never callbacks"
- "Prefer functional programming over OOP"
- "Mobile-first approach for all UI work"
- "Accessibility is non-negotiable (WCAG AA minimum)"

_Add your project's non-negotiables here._

---

## Customization Notes

_Additional project constraints, team agreements, or conventions not covered above._
