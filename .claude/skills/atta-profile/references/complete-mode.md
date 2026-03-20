# Complete Mode — Remaining Profile Sections

> Covers all profile sections NOT asked by `--update`. Skips sections that already have checked items. Groups remaining questions into 3 rounds.

## Detect Already-Configured Sections

Read `.atta/local/developer-profile.md`. **Skip any section that already has `[x]` checkboxes** (or for Naming Conventions: placeholder values replaced with detected values by `/atta`).

`--complete` owns: Exception Cases, Output Format, Code Examples, Testing Approach, Documentation, Naming Conventions. Always skip the 5 sections owned by `--update`.

> If all sections are already configured, inform the user and jump to Apply Mode.

Inform the user before starting:

```markdown
## Complete Profile Setup

This will configure the remaining sections of your profile in 3 short rounds.
Sections you've already configured will be skipped.
```

## Round 1 — Communication & Code Style

**Question C1 — Exception Cases** (multi-select)

> When is it OK for AI to write code directly without guidance?

Options:
- Unit tests (repetitive boilerplate)
- Configuration files (JSON, YAML, etc.)
- Documentation (README, comments, JSDoc)

**Question C2 — Output Format** (multi-select)

> How do you prefer AI to present code and suggestions?

Options:
- Markdown (for copy-paste workflows)
- Inline code blocks
- File diffs
- Step-by-step instructions

**Question C3 — Code Examples**

> When AI shows code examples, what style do you prefer?

Options:
- **Minimal** — 2-5 lines to illustrate the concept
- **Complete** — full function/component ready to use
- **Reference existing** — point to code already in the project
- **Pseudocode** — language-agnostic logic first

## Round 2 — Workflow

**Question C4 — Testing Approach**

> What's your preferred testing strategy?

Options:
- **TDD** — tests first, then implementation
- **Test-after** — implement, then write tests
- **Critical paths only** — test what matters most
- **High coverage** — aim for 80%+ coverage

**Question C5 — Documentation Style**

> How should code be documented?

Options:
- Inline comments for complex logic
- JSDoc/docstrings for all public APIs
- README files for each major module
- Minimal comments (code should be self-documenting)

## Round 3 — Naming Conventions (Free-Text)

Ask conversationally (not AskUserQuestion): naming preferences for functions, constants, CSS classes (camelCase/snake_case/PascalCase/UPPER_SNAKE_CASE/kebab-case/BEM). "Skip" leaves defaults.

If the user provides specific naming preferences, update the Naming Conventions section in `.atta/local/developer-profile.md` with those answers; if they say "skip" or provide no preferences, leave that section unchanged.

## Write Profile Updates

Write all sections to **`.atta/local/developer-profile.md`** only (personal, gitignored):

- Map C1 → "Exception Cases" section
- Map C2 → "Output Format" section
- Map C3 → "Code Examples" section
- Map C4 → "Testing Approach" section
- Map C5 → "Documentation" section
- Map Round 3 → "Naming Conventions" section

> Preserve all other sections unchanged — especially those set by `--update`.

Confirm to the user:

```markdown
Profile completed! All sections configured. Now applying to your project...
```

**Continue to Apply Mode** (--complete chains to --apply automatically).
