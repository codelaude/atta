# Developer Profile & Working Preferences

> **Purpose:** This file helps AI assistants understand your working style and preferences.
> **Setup:** Customize this template during `/init` or edit it anytime to reflect your preferences.

---

## Working Style

### AI Collaboration Approach
- [ ] **Guidance-first**: Prefer questions and hints over direct implementation
- [ ] **Implementation-first**: Prefer direct code suggestions
- [ ] **Balanced**: Depends on task complexity and time constraints

### Code Ownership
- [ ] **Review-ready**: AI can generate code for review, I take ownership
- [ ] **Learning-focused**: AI guides, I implement to learn the codebase
- [ ] **Time-sensitive**: AI implements, I review and refine

### Exception Cases
_When is it OK for AI to write code directly without guidance?_
- [ ] Unit tests (repetitive boilerplate)
- [ ] Configuration files (JSON, YAML, etc.)
- [ ] Documentation (README, comments, JSDoc)
- [ ] Other: _______________________________

---

## Communication Preferences

### Output Format
- [ ] Markdown (for copy-paste workflows)
- [ ] Inline code blocks
- [ ] File diffs
- [ ] Step-by-step instructions

### Response Style
- [ ] Concise and actionable
- [ ] Detailed with explanations
- [ ] Questions first, answers second
- [ ] Direct recommendations

### Code Examples
- [ ] Minimal (2-5 lines to illustrate concept)
- [ ] Complete (full function/component)
- [ ] Reference existing code in project
- [ ] Pseudocode preferred

---

## Workflow Preferences

### PR (Pull Request) Workflow
- [ ] Generate PR descriptions as markdown code blocks
- [ ] Include pre-validation checklist in PR
- [ ] Auto-run tests before PR creation
- [ ] Keep PRs minimal (small, focused changes)

### Testing Approach
- [ ] TDD (tests first, then implementation)
- [ ] Test-after (implement, then test)
- [ ] Critical paths only
- [ ] High coverage preferred (80%+)

### Code Review Priorities
_What should AI focus on during code review?_
- [ ] Correctness and bugs
- [ ] Performance and optimization
- [ ] Readability and maintainability
- [ ] Security vulnerabilities
- [ ] Accessibility compliance
- [ ] Test coverage

---

## Learning & Guidance Approach

### When Stuck on Implementation
1. [ ] Ask clarifying questions about what's been tried
2. [ ] Reference patterns from `.claude/knowledge/`
3. [ ] Suggest next debugging steps
4. [ ] Explain the "why" behind suggestions
5. [ ] Provide minimal code examples
6. [ ] If deadline-critical, offer full implementation with explanation

### Preferred Learning Resources
_Where should AI point you for more information?_
- [ ] Project's own pattern files (`.claude/knowledge/patterns/`)
- [ ] Official documentation (framework/language docs)
- [ ] Internal examples (existing code in this project)
- [ ] External tutorials and guides

---

## Tech Stack Preferences

### Documentation
- [ ] Inline comments for complex logic
- [ ] JSDoc/docstrings for all public APIs
- [ ] README files for each major module
- [ ] Minimal comments (code should be self-documenting)

### Error Handling
- [ ] Defensive (validate all inputs, fail gracefully)
- [ ] Fast-fail (throw early, catch at boundaries)
- [ ] User-friendly (show user-facing error messages)
- [ ] Developer-friendly (detailed errors in console/logs)

### Naming Conventions
_Any project-specific naming preferences?_
- Functions: `[camelCase / snake_case / PascalCase]`
- Variables: `[camelCase / snake_case]`
- Constants: `[UPPER_SNAKE_CASE / camelCase]`
- Interfaces/Types: `[IInterface / Interface / TInterface]`
- CSS Classes: `[kebab-case / camelCase / BEM]`

---

## Customization Notes

_Add any additional preferences, constraints, or working style notes here._

**Example:**
- "Always use async/await, never callbacks"
- "Prefer functional programming over OOP"
- "Mobile-first approach for all UI work"
- "Accessibility is non-negotiable (WCAG AA minimum)"
