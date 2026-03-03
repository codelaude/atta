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
/profile --ci-review       # Architect: configure CI provider + project-profile for CI-aware review
```

---

## Execution Steps

### Step 0: Flag Check

> **`--update` flag?** Jump to [Update Mode](#update-mode).
> **`--complete` flag?** Jump to [Complete Mode](#complete-mode).
> **`--apply` flag?** Jump to [Apply Mode](#apply-mode).
> **`--ci-review` flag?** Jump to [CI Review Mode](#ci-review-mode).
> **No flag?** Continue to Step 1 (View Mode).

---

## View Mode (default)

### Step 1: Read Profile

Read both profile files:
- `.atta/knowledge/project/developer-profile.md` — personal AI collaboration prefs (gitignored)
- `.atta/knowledge/project/project-profile.md` — team conventions and review priorities (committed)

If neither file has any `[x]` checkboxes, show:

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

Update checkboxes based on the user's answers — written to **`developer-profile.md`** only (personal, gitignored):

- Map Q1 → "AI Collaboration Approach" section
- Map Q2 → "Response Style" section
- Map Q3 → "Code Review Priorities" section
- Map Q4 → "Code Ownership" section
- Map Q5 → "Error Handling" section

Read the file, set `[x]` for selected options and `[ ]` for unselected, then write back.

> **`project-profile.md` is never touched by `--update`.** Team conventions (committed, shared) are set by the lead engineer via `/profile --ci-review`.
>
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

> **Note**: All sections above live in `developer-profile.md` (personal, gitignored). `project-profile.md` is owned exclusively by `/profile --ci-review` — never read for skip-detection here, never written to by `--update` or `--complete`.

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

Write all sections to **`developer-profile.md`** only (personal, gitignored):

- Map C1 → "Exception Cases" section
- Map C2 → "Output Format" section
- Map C3 → "Code Examples" section
- Map C4 → "Testing Approach" section
- Map C5 → "Documentation" section
- Map Round 3 → "Naming Conventions" section

> **`project-profile.md` is never touched by `--complete`.** Team conventions are set by the lead engineer via `/profile --ci-review`.
>
> Preserve all other sections unchanged — especially those set by `--update`.

Confirm to the user:

```markdown
Profile completed! All sections configured. Now applying to your project...
```

**Continue to [Apply Mode](#apply-mode)** (--complete chains to --apply automatically).

---

## Apply Mode

### Step 5: Parse Profile

Read both profile files:
- `.atta/knowledge/project/developer-profile.md` — personal prefs (may not exist if gitignored and not yet created)
- `.atta/knowledge/project/project-profile.md` — team conventions

If neither file has any checked items:

```markdown
No profile to apply. Run `/profile --update` first to set your preferences.
```

Stop here.

Extract the checked preferences into structured data:

**From `developer-profile.md`** (personal):
- `collaboration`: guidance-first | implementation-first | balanced
- `responseStyle`: concise | detailed | questions-first | direct
- `codeOwnership`: review-ready | learning-focused | time-sensitive
- `exceptionCases`: list of checked cases (tests, configs, docs)
- `outputFormat`: list of checked formats
- `codeExamples`: minimal | complete | reference-existing | pseudocode

**From `project-profile.md`** (team):
- `reviewPriorities`: list of checked priorities
- `errorHandling`: defensive | fast-fail | user-friendly | developer-friendly
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

2. **Generation-time** (on next `/atta` run): During agent generation, `/atta` reads both `developer-profile.md` (personal style) and `project-profile.md` (team conventions) and appends a `## Developer Preferences` section to each generated agent file. This is centralized in `generator.md` Phase 4 "Profile Injection" — not in individual templates. The section includes response style, collaboration approach, review priorities, and other preferences extracted from the profile.

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

## CI Review Mode

> Architect/lead engineer mode. Configures CI provider settings and `project-profile.md` (team conventions). **Never touches `developer-profile.md`.**

### Step CI-1: Read Existing State

Read both files (if they exist) to pre-fill answers where possible:
- `.atta/knowledge/project/project-profile.md`
- `.github/workflows/atta-review.yml`

Inform the user:

```markdown
## CI Review Setup

This will configure two things:
1. **CI provider** — which action and auth method to use for the GitHub Action
2. **Project profile** — team conventions that shape what the CI reviewer checks

Changes here affect the whole team (committed files). Personal preferences use `/profile --update` instead.
```

### Step CI-2: Ask CI Configuration Questions

Use AskUserQuestion to ask the following questions. Each is independent — ask all that don't already have a clear answer from the existing `atta-review.yml`.

**Question CI-Q1 — AI Provider (page 1 of 2)**

> Which AI provider should the CI review workflow use?

Options:
- **Anthropic (direct)** — `claude-code-action`, uses `ANTHROPIC_API_KEY`
- **AWS Bedrock** — `claude-code-action` + IAM role, no API key stored
- **GCP Vertex AI** — `claude-code-action` + Workload Identity, no API key stored
- **Other providers →** — OpenAI, Azure OpenAI, or Ollama

If "Other providers →" is selected, immediately ask **CI-Q1 page 2**:

> Which provider?

Options:
- **OpenAI** — `appleboy/LLM-action` with OpenAI, uses `OPENAI_API_KEY`
- **Azure OpenAI** — `appleboy/LLM-action` with Azure, uses `AZURE_OPENAI_API_KEY`
- **Ollama (self-hosted)** — `appleboy/LLM-action` with local model, no API key needed
- **← Back** — return to the previous question

**Question CI-Q2 — Runner OS**

> What GitHub Actions runner should the workflow use?

Options:
- **ubuntu-latest** — standard GitHub-hosted runner (recommended for most projects)
- **self-hosted** — your own runner (required for Ollama or private VPCs)

**Question CI-Q3 — Draft PRs**

> Should the workflow also run on draft PRs?

Options:
- **Skip drafts** — only trigger on `opened`, `synchronize`, `reopened` (recommended)
- **Include drafts** — also trigger on `ready_for_review` (catches issues earlier)

### Step CI-3: Ask Project-Profile Questions

> These shape what the CI reviewer checks. They're team-level conventions, not personal preferences.

Ask the following. **Skip any section that already has a `[x]` in `project-profile.md`.**

**Question CI-P1 — Review Priorities (page 1 of 2)** (multi-select)

> What should the CI code reviewer focus on? (select all that apply)

Options:
- Correctness and bugs
- Security vulnerabilities
- Readability and maintainability
- More priorities → — Performance, Accessibility, Test coverage

If "More priorities →" is selected, immediately ask **CI-P1 page 2** and accumulate selections from both pages:

> Any of these too? (select all that apply)

Options:
- Performance
- Accessibility
- Test coverage
- ← Done — no more needed

**Question CI-P2 — Testing Approach**

> What's the team's preferred testing strategy?

Options:
- **TDD** — tests first, then implementation
- **Test-after** — implement, then write tests
- **Critical paths only** — test what matters most
- **High coverage** — aim for 80%+ coverage

**Question CI-P3 — Error Handling**

> How should code handle errors?

Options:
- **Defensive** — validate all inputs, fail gracefully
- **Fast-fail** — throw early, catch at boundaries
- **User-friendly** — prioritize user-facing error messages
- **Developer-friendly** — detailed errors in console/logs

**Question CI-P4 — Naming Conventions** (free-text, conversational — not AskUserQuestion)

> **Naming conventions** — Any team standards? For example:
> - Functions: `camelCase`, `snake_case`, or `PascalCase`?
> - Constants: `UPPER_SNAKE_CASE` or `camelCase`?
> - CSS classes: `kebab-case`, `camelCase`, or `BEM`?
>
> Type your conventions, or say "skip" to leave defaults.

**Question CI-P5 — Tech Stack Non-Negotiables** (free-text, conversational)

> **Tech stack non-negotiables** — Anything the CI reviewer should never flag as an issue?
> For example: "we use `any` types intentionally", "console.log is allowed in scripts", "tabs not spaces".
>
> Type your exceptions, or say "skip".

### Step CI-4: Write `project-profile.md`

Update `.atta/knowledge/project/project-profile.md` with the answers from Step CI-3:

- Map CI-P1 → "Code Review Priorities" section (set `[x]` for selected, `[ ]` for unselected)
- Map CI-P2 → "Testing Approach" section
- Map CI-P3 → "Error Handling" section
- Map CI-P4 → "Naming Conventions" section (replace placeholder values with user's answer, or leave unchanged if skipped)
- Map CI-P5 → "Tech Stack Non-Negotiables" section (append user's exceptions as a list, or leave unchanged if skipped)

> Preserve all other sections unchanged. Only update the 5 sections answered in Step CI-3.

### Step CI-5: Offer to Regenerate `atta-review.yml`

Map CI-Q1 and CI-Q2 answers to the correct CLI command:

| Provider | Command |
|----------|---------|
| Anthropic direct | `atta init --adapter github-action` |
| AWS Bedrock | `atta init --adapter github-action --auth-backend bedrock` |
| GCP Vertex AI | `atta init --adapter github-action --auth-backend vertex` |
| OpenAI | `atta init --adapter github-action --provider openai` |
| Azure OpenAI | `atta init --adapter github-action --provider azure` |
| Ollama | `atta init --adapter github-action --provider ollama` |

If runner OS is `self-hosted`, note that the user will need to edit `runs-on:` in the generated YAML manually (it's a post-generation config change).

Ask the user (conversational, not AskUserQuestion):

> **Regenerate `atta-review.yml`?**
>
> Run this command to generate the workflow with your selected provider:
> ```
> [computed command from table above]
> ```
> Type `yes` to generate now, or `no` to run it yourself later.

If yes: tell the user to run the command in their terminal (do not execute it for them — it modifies the filesystem and should be user-initiated). Show the exact command again clearly.

If no: show the command for later reference.

### Step CI-6: Summary

Show a final summary of what changed and what to commit:

```markdown
## CI Review Configuration Complete

### What changed
- **`project-profile.md`** updated with team conventions (review priorities, testing, error handling, naming)
- **Provider selected**: [provider name] → [computed CLI command]

### Next steps

**Commit to the repo** (shared with the whole team):
```bash
git add .atta/knowledge/project/project-profile.md
git add .github/workflows/atta-review.yml    # if regenerated
git commit -m "ci: configure Atta review workflow + project profile"
```

**Do NOT commit** (personal, gitignored):
- `.atta/knowledge/project/developer-profile.md` — your personal AI collaboration preferences

### Setup checklist
- [ ] Add the required secret to GitHub: `Settings → Secrets → Actions`
  - Anthropic direct / Bedrock / Vertex → `ANTHROPIC_API_KEY` (or IAM role — see generated YAML comment)
  - OpenAI → `OPENAI_API_KEY`
  - Azure → `AZURE_OPENAI_API_KEY`
  - Ollama → no secret needed (self-hosted)
- [ ] Run `/atta` first if you haven't — it populates `project-context.md` and pattern files that significantly improve review quality
- [ ] Commit and push to trigger the first CI review on a test PR
```

---

## Error Handling & Recovery

### Profile File Not Found

```markdown
Profile files not found:
- Personal: `.atta/knowledge/project/developer-profile.md` (gitignored — create locally)
- Team: `.atta/knowledge/project/project-profile.md` (committed — may need to run `/atta` or `npx atta-dev init`)

Recovery options:
1. Run `/profile --update` to create both interactively
2. Run `npx atta-dev init` to set up the full project (includes both profiles)
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
