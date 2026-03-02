---
name: profile
description: View, update, and apply developer profile preferences. Manages working style, response preferences, and review priorities that shape how agents collaborate with you.
---

You are now acting as the **Profile Manager** — responsible for viewing, updating, and propagating developer preferences.

## How to Use

```
/profile                   # View current preferences (formatted summary)
/profile --update          # Quick: answer 5 core questions, writes profile, then auto-applies
/profile --complete        # Full: all remaining sections not covered by --update (grouped into rounds)
/profile --apply           # Expert: parse existing profile, propagate to project-context + agents
```

---

## Execution Steps

### Step 0: Flag Check

> **`--update` flag?** Jump to [Update Mode](#update-mode).
> **`--complete` flag?** Jump to [Complete Mode](#complete-mode).
> **`--apply` flag?** Jump to [Apply Mode](#apply-mode).
> **No flag?** Continue to Step 1 (View Mode).

---

## View Mode (default)

### Step 1: Read Profile

Read `.atta/knowledge/project/developer-profile.md`.

If the file does not exist or contains only the unfilled template (no `[x]` checkboxes), show:

```markdown
## Developer Profile

No profile configured yet. Run `/profile --update` to set your preferences.

Your profile shapes how agents collaborate with you — response style, review priorities, and working approach.
```

Stop here.

### Step 2: Display Formatted Summary

Parse the profile and display a formatted summary. Extract only the checked (`[x]`) items from each section.

```markdown
## Developer Profile Summary

### Working Style
- **Collaboration**: [checked approach]
- **Code Ownership**: [checked ownership style]
- **AI Direct Write**: [list checked exception cases, or "None configured"]

### Communication
- **Response Style**: [checked style]
- **Output Format**: [checked formats, or "Not configured"]
- **Code Examples**: [checked preference, or "Not configured"]

### Workflow
- **Review Priorities**: [list all checked priorities]
- **Testing**: [checked approach, or "Not configured"]
- **PR Style**: [checked preferences, or "Not configured"]

### Tech Preferences
- **Error Handling**: [checked approach, or "Not configured"]
- **Documentation**: [checked style, or "Not configured"]
```

> Only show sections that have at least one checked item. Omit empty sections entirely.

After the summary, show actions based on what's configured:

If extended sections (Exception Cases, Output Format, Code Examples, Testing, Documentation) have no checked items:

```markdown
---
**Actions:** `/profile --update` to change core preferences | `/profile --complete` to configure all sections | `/profile --apply` to propagate to agents
```

If all sections are configured:

```markdown
---
**Actions:** `/profile --update` to change core preferences | `/profile --apply` to propagate to agents
```

Stop here.

---

## Update Mode

### Step 3: Ask Profile Questions

Use AskUserQuestion to ask 5 questions. Ask all 5 sequentially (each depends on the conversational flow, not on previous answers).

**Question 1 — Collaboration Approach**

> How do you prefer AI to help you?

Options:
- **Balanced** — guide on complex tasks, implement on routine ones
- **Guidance-first** — questions and hints over direct code
- **Implementation-first** — direct code suggestions, you review

**Question 2 — Response Style**

> What response style do you prefer?

Options:
- **Concise** — straight to the point, actionable
- **Detailed** — teach as you go, explain reasoning
- **Questions-first** — clarify before acting
- **Direct** — give direct recommendations, skip alternatives

**Question 3 — Code Review Priorities** (multi-select)

> What should code reviews focus on? (select all that apply)

Options:
- Correctness and bugs
- Security vulnerabilities
- Readability and maintainability
- Performance
- Accessibility
- Test coverage

**Question 4 — Code Ownership**

> When AI generates code, how do you prefer to work with it?

Options:
- **Review-ready** — AI generates, you review and own it
- **Learning-focused** — AI guides, you implement to learn
- **Time-sensitive** — AI implements fully, you refine

**Question 5 — Error Handling Philosophy**

> How should code handle errors?

Options:
- **Defensive** — validate all inputs, fail gracefully
- **Fast-fail** — throw early, catch at boundaries
- **User-friendly** — prioritize user-facing error messages
- **Developer-friendly** — detailed errors in console/logs

### Step 4: Write Profile

Read the current `.atta/knowledge/project/developer-profile.md` template.

Update the checkboxes based on the user's answers:
- Set `[x]` for selected options, `[ ]` for unselected
- Map Q1 → "AI Collaboration Approach" section
- Map Q2 → "Response Style" section
- Map Q3 → "Code Review Priorities" section
- Map Q4 → "Code Ownership" section
- Map Q5 → "Error Handling" section

Write the updated file back to `.atta/knowledge/project/developer-profile.md`.

> Preserve all other sections unchanged. Only update the 5 sections corresponding to the questions asked.

Confirm to the user:

```markdown
Profile updated with core preferences. Now applying to your project...

> Want to configure everything? Run `/profile --complete` to set output format, testing approach, code examples, documentation style, and more.
```

**Continue to [Apply Mode](#apply-mode)** (--update chains to --apply automatically).

---

## Complete Mode

> Covers all profile sections NOT asked by `--update`. Skips sections that already have checked items. Groups remaining questions into 3 rounds.

### Step 3c: Detect Already-Configured Sections

Read `.atta/knowledge/project/developer-profile.md`. For each section below, check if it's already configured. **Skip any section that's already configured.**

A section is "configured" if:
- It has at least one `[x]` checkbox, OR
- For Naming Conventions: the placeholder values (e.g., `[camelCase / snake_case / PascalCase]`) have been replaced with a single value (e.g., `camelCase`) — meaning `/atta` auto-detected them

Sections owned by `--update` (always skip in --complete):
- AI Collaboration Approach
- Response Style
- Code Review Priorities
- Code Ownership
- Error Handling

Sections owned by `--complete`:
- Exception Cases
- Output Format
- Code Examples
- Testing Approach
- Documentation
- Naming Conventions

> If all sections are already configured, inform the user and jump to [Apply Mode](#apply-mode).

Inform the user before starting:

```markdown
## Complete Profile Setup

This will configure the remaining sections of your profile in 3 short rounds.
Sections you've already configured will be skipped.
```

### Step 3d: Round 1 — Communication & Code Style

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

### Step 3e: Round 2 — Workflow

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

### Step 3f: Round 3 — Naming Conventions (Free-Text)

Ask the user as a single conversational question (not AskUserQuestion — this is free-text):

> **Naming conventions** — Do you have preferences for naming? For example:
> - Functions: `camelCase`, `snake_case`, or `PascalCase`?
> - Constants: `UPPER_SNAKE_CASE` or `camelCase`?
> - CSS classes: `kebab-case`, `camelCase`, or `BEM`?
>
> Type your preferences, or say "skip" to leave defaults.

If the user provides preferences, update the Naming Conventions section in `developer-profile.md` with their answers. If "skip", leave the section unchanged.

### Step 3g: Write Profile Updates

Read the current `.atta/knowledge/project/developer-profile.md`.

Update only the sections corresponding to the questions asked in this --complete run:
- Map C1 → "Exception Cases" section
- Map C2 → "Output Format" section
- Map C3 → "Code Examples" section
- Map C4 → "Testing Approach" section
- Map C5 → "Documentation" section
- Map Round 3 → "Naming Conventions" section

> Preserve all other sections unchanged — especially the ones set by `--update`.

Confirm to the user:

```markdown
Profile completed! All sections configured. Now applying to your project...
```

**Continue to [Apply Mode](#apply-mode)** (--complete chains to --apply automatically).

---

## Apply Mode

### Step 5: Parse Profile

Read `.atta/knowledge/project/developer-profile.md`.

If the file does not exist or has no checked items:

```markdown
No profile to apply. Run `/profile --update` first to set your preferences.
```

Stop here.

Extract the checked preferences into structured data:

**Core (from --update):**
- `collaboration`: guidance-first | implementation-first | balanced
- `responseStyle`: concise | detailed | questions-first | direct
- `codeOwnership`: review-ready | learning-focused | time-sensitive
- `reviewPriorities`: list of checked priorities
- `errorHandling`: defensive | fast-fail | user-friendly | developer-friendly

**Extended (from --complete, if configured):**
- `exceptionCases`: list of checked cases (tests, configs, docs)
- `outputFormat`: list of checked formats
- `codeExamples`: minimal | complete | reference-existing | pseudocode
- `testingApproach`: TDD | test-after | critical-paths | high-coverage
- `documentation`: inline-comments | jsdoc | readme-per-module | minimal

### Step 6: Update project-context.md Preferences Section

Read `.atta/knowledge/project/project-context.md`.

Write or replace a `## Preferences` section at the end of the file. The section must be 3-5 lines — distilled, not verbose.

Format (3-5 lines — only include lines where data exists):

```markdown
## Preferences

- **Style**: [collaboration] collaboration, [responseStyle] responses
- **Reviews**: Focus on [comma-separated review priorities]
- **Approach**: [codeOwnership] code ownership, [errorHandling] error handling
- **Workflow**: [testingApproach] testing, [documentation] docs, [outputFormat] output
- **AI direct-write OK**: [exceptionCases list, or omit line if none]
```

Example (core only — after `--update`):

```markdown
## Preferences

- **Style**: Balanced collaboration, concise responses
- **Reviews**: Focus on correctness, security, readability
- **Approach**: Review-ready code ownership, fast-fail error handling
```

Example (full — after `--complete`):

```markdown
## Preferences

- **Style**: Balanced collaboration, concise responses
- **Reviews**: Focus on correctness, security, readability
- **Approach**: Review-ready code ownership, fast-fail error handling
- **Workflow**: TDD testing, minimal docs, markdown + diffs output
- **AI direct-write OK**: tests, configs
```

> If a `## Preferences` section already exists, replace it entirely. If project-context.md doesn't exist, create it with just this section.

### Step 7: Agent Template Propagation

Profile preferences propagate to agents through two layers:

1. **Runtime** (immediate): The `## Preferences` section written to `project-context.md` in Step 6. All agents that read `project-context.md` pick up preferences automatically — no file changes needed.

2. **Generation-time** (on next `/atta` run): During agent generation, `/atta` reads `developer-profile.md` and appends a `## Developer Preferences` section to each generated agent file. This is centralized in `generator.md` Phase 4 "Profile Injection" — not in individual templates. The section includes response style, collaboration approach, review priorities, and other preferences extracted from the profile.

> **Tip**: If the user has changed profile preferences and wants generated agents to reflect them, suggest running `/atta --rescan` to regenerate agents with the updated profile variables.

Report what was propagated:

```markdown
## Profile Applied

**Preferences written to** `project-context.md`:
- Style: [collaboration] collaboration, [responseStyle] responses
- Reviews: [priorities]
- Approach: [ownership], [errorHandling]

**Agent propagation**:
- **Runtime**: All agents that read `project-context.md` will pick up your preferences automatically.
- **Generation-time**: Run `/atta --rescan` to regenerate agents with profile-specific behavior baked in.
```

---

## Error Handling & Recovery

### Profile File Not Found

```markdown
Developer profile not found at `.atta/knowledge/project/developer-profile.md`.

Recovery options:
1. Run `/profile --update` to create one interactively
2. Run `npx atta-dev init` to set up the full project (includes profile)
3. Copy the template manually from `.atta/knowledge/project/developer-profile.md`
```

### project-context.md Not Found

Create a minimal `project-context.md` with just the Preferences section. Inform the user:

```markdown
Created `project-context.md` with your preferences. Run `/atta` to populate the full project context (tech stack, structure, etc.).
```

### Profile Has No Checked Items

```markdown
Your profile exists but has no preferences selected.

Run `/profile --update` to set your preferences interactively.
```
