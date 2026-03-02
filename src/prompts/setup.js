import * as p from '@clack/prompts';
import { printBanner } from '../banner.js';

/**
 * Interactive setup prompts for `npx atta-dev init`.
 * Asks 5 questions (adapter, collaboration, response style, review priorities, tutorial) and returns answers for profile pre-fill.
 */
export async function runSetupPrompts(options = {}) {
  printBanner();

  // If adapter wasn't specified via CLI flag, ask
  const adapter =
    options.adapter ||
    (await p.select({
          message: 'Which AI tool are you using?',
          options: [
            {
              value: 'claude-code',
              label: 'Claude Code',
              hint: 'recommended',
            },
            { value: 'copilot', label: 'Copilot CLI' },
            { value: 'codex', label: 'Codex CLI' },
            { value: 'gemini', label: 'Gemini CLI' },
          ],
        }));

  if (p.isCancel(adapter)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  const collaboration = await p.select({
    message: 'How do you prefer AI to help you?',
    options: [
      {
        value: 'balanced',
        label: 'Balanced',
        hint: 'guide on complex tasks, implement on routine ones',
      },
      {
        value: 'guidance-first',
        label: 'Guidance-first',
        hint: 'questions and hints over direct code',
      },
      {
        value: 'implementation-first',
        label: 'Implementation-first',
        hint: 'direct code suggestions, I review',
      },
    ],
  });

  if (p.isCancel(collaboration)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  const responseStyle = await p.select({
    message: 'What response style do you prefer?',
    options: [
      {
        value: 'concise',
        label: 'Concise and actionable',
        hint: 'straight to the point',
      },
      {
        value: 'detailed',
        label: 'Detailed with explanations',
        hint: 'teach me as you go',
      },
      {
        value: 'questions-first',
        label: 'Questions first',
        hint: 'clarify before acting',
      },
    ],
  });

  if (p.isCancel(responseStyle)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  const reviewPriorities = await p.multiselect({
    message: 'What should code reviews focus on? (select all that apply)',
    options: [
      { value: 'correctness', label: 'Correctness and bugs' },
      { value: 'security', label: 'Security vulnerabilities' },
      { value: 'readability', label: 'Readability and maintainability' },
      { value: 'performance', label: 'Performance' },
      { value: 'accessibility', label: 'Accessibility' },
      { value: 'tests', label: 'Test coverage' },
    ],
    required: true,
  });

  if (p.isCancel(reviewPriorities)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  const runTutorial = await p.confirm({
    message: 'Include the interactive tutorial? (runs inside your AI tool, uses tokens)',
    initialValue: true,
  });

  if (p.isCancel(runTutorial)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  return {
    adapter,
    collaboration,
    responseStyle,
    reviewPriorities,
    includeTutorial: runTutorial,
  };
}

/**
 * Generate a pre-filled developer-profile.md from setup answers.
 */
export function generateProfile(answers) {
  const { collaboration, responseStyle, reviewPriorities } = answers;

  const check = (condition) => (condition ? '[x]' : '[ ]');

  return `# Developer Profile & Working Preferences

> **Purpose:** This file helps AI assistants understand your working style and preferences.
> **Setup:** Pre-filled during \`npx atta-dev init\`. Edit anytime to refine.

---

## Working Style

### AI Collaboration Approach
- ${check(collaboration === 'guidance-first')} **Guidance-first**: Prefer questions and hints over direct implementation
- ${check(collaboration === 'implementation-first')} **Implementation-first**: Prefer direct code suggestions
- ${check(collaboration === 'balanced')} **Balanced**: Depends on task complexity and time constraints

### Code Ownership
- ${check(collaboration === 'implementation-first')} **Review-ready**: AI can generate code for review, I take ownership
- ${check(collaboration === 'guidance-first')} **Learning-focused**: AI guides, I implement to learn the codebase
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
- ${check(responseStyle === 'concise')} Concise and actionable
- ${check(responseStyle === 'detailed')} Detailed with explanations
- ${check(responseStyle === 'questions-first')} Questions first, answers second
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
- ${check(reviewPriorities.includes('correctness'))} Correctness and bugs
- ${check(reviewPriorities.includes('performance'))} Performance and optimization
- ${check(reviewPriorities.includes('readability'))} Readability and maintainability
- ${check(reviewPriorities.includes('security'))} Security vulnerabilities
- ${check(reviewPriorities.includes('accessibility'))} Accessibility compliance
- ${check(reviewPriorities.includes('tests'))} Test coverage

---

## Learning & Guidance Approach

### When Stuck on Implementation
1. [ ] Ask clarifying questions about what's been tried
2. [ ] Reference patterns from \`.atta/knowledge/\`
3. [ ] Suggest next debugging steps
4. [ ] Explain the "why" behind suggestions
5. [ ] Provide minimal code examples
6. [ ] If deadline-critical, offer full implementation with explanation

### Preferred Learning Resources
_Where should AI point you for more information?_
- [ ] Project's own pattern files (\`.atta/knowledge/patterns/\`)
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
- Functions: \`[camelCase / snake_case / PascalCase]\`
- Variables: \`[camelCase / snake_case]\`
- Constants: \`[UPPER_SNAKE_CASE / camelCase]\`
- Interfaces/Types: \`[IInterface / Interface / TInterface]\`
- CSS Classes: \`[kebab-case / camelCase / BEM]\`

---

## Customization Notes

_Add any additional preferences, constraints, or working style notes here._

**Example:**
- "Always use async/await, never callbacks"
- "Prefer functional programming over OOP"
- "Mobile-first approach for all UI work"
- "Accessibility is non-negotiable (WCAG AA minimum)"
`;
}
