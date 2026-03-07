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

## File Ownership

| Mode | Writes to | Never writes |
|------|-----------|--------------|
| `--update`, `--complete` | `developer-profile.md` (personal, gitignored) | `project-profile.md` |
| `--ci-review` | `project-profile.md` (team, committed) | `developer-profile.md` |
| `--apply` | `project-context.md` (reads both profiles) | Neither profile |

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
- `.atta/knowledge/developer-profile.md` — personal AI collaboration prefs (gitignored)
- `.atta/project/project-profile.md` — team conventions and review priorities (committed)

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

After the summary, show actions:

```markdown
---
**Actions:** `/profile --update` to change core | `/profile --complete` to configure remaining sections | `/profile --apply` to propagate
```

> Omit `--complete` from actions if all sections are already configured.

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

Read `.atta/knowledge/developer-profile.md`. **Skip any section that already has `[x]` checkboxes** (or for Naming Conventions: placeholder values replaced with detected values by `/atta`).

`--complete` owns: Exception Cases, Output Format, Code Examples, Testing Approach, Documentation, Naming Conventions. Always skip the 5 sections owned by `--update`.

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

Ask conversationally (not AskUserQuestion): naming preferences for functions, constants, CSS classes (camelCase/snake_case/PascalCase/UPPER_SNAKE_CASE/kebab-case/BEM). "Skip" leaves defaults.

If the user provides specific naming preferences, update the Naming Conventions section in `developer-profile.md` with those answers; if they say "skip" or provide no preferences, leave that section unchanged.

### Step 3g: Write Profile Updates

Write all sections to **`developer-profile.md`** only (personal, gitignored):

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

**Continue to [Apply Mode](#apply-mode)** (--complete chains to --apply automatically).

---

## Apply Mode

### Step 5: Parse Profile

Read both profile files:
- `.atta/knowledge/developer-profile.md` — personal prefs (may not exist if gitignored and not yet created)
- `.atta/project/project-profile.md` — team conventions

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

Read `.atta/project/project-context.md`.

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

Example:

```markdown
## Preferences

- **Style**: Balanced collaboration, concise responses
- **Reviews**: Focus on correctness, security, readability
- **Approach**: Review-ready code ownership, fast-fail error handling
- **Workflow**: TDD testing, minimal docs, markdown + diffs output  ← only after --complete
- **AI direct-write OK**: tests, configs                           ← only after --complete
```

> Only include lines where data exists. Replace existing `## Preferences` section entirely. If `project-context.md` doesn't exist, create it with just this section.

### Step 7: Agent Propagation

Preferences propagate via two layers:
1. **Runtime** (immediate): `project-context.md` `## Preferences` section — all agents pick it up automatically.
2. **Generation-time** (next `/atta --rescan`): `/atta` reads both profiles and injects a `## Developer Preferences` section into each generated agent file (centralized in `generator.md` Phase 4).

Report: show the preferences written to `project-context.md` and suggest `/atta --rescan` to bake preferences into generated agents.

---

## CI Review Mode

> Architect/lead engineer mode. Configures CI provider settings and `project-profile.md` (team conventions). **Never touches `developer-profile.md`.**

### Step CI-1: Read Existing State

Read both files (if they exist) to pre-fill answers where possible:
- `.atta/project/project-profile.md`
- `.github/workflows/atta-review.yml`

Inform the user: "CI Review Setup — configures CI provider (action + auth) and project-profile (team conventions). Changes affect the whole team (committed files)."

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

**Question CI-P1 — Review Priorities** (multi-select, paginated)

Same 6 options as Q3 above, but paginated (max 4 per AskUserQuestion):
- Page 1: Correctness and bugs, Security vulnerabilities, Readability and maintainability, "More priorities →"
- Page 2 (if needed): Performance, Accessibility, Test coverage, "← Done"

Accumulate selections from both pages.

**Question CI-P2 — Testing Approach** — Same options as C4 above.

**Question CI-P3 — Error Handling** — Same options as Q5 above.

**Question CI-P4 — Naming Conventions** (free-text, conversational — not AskUserQuestion)

> Any team naming standards? (functions: camelCase/snake_case/PascalCase, constants: UPPER_SNAKE_CASE/camelCase, CSS: kebab-case/camelCase/BEM) — Type conventions or "skip".

**Question CI-P5 — Tech Stack Non-Negotiables** (free-text, conversational)

> **Tech stack non-negotiables** — Anything the CI reviewer should never flag as an issue?
> For example: "we use `any` types intentionally", "console.log is allowed in scripts", "tabs not spaces".
>
> Type your exceptions, or say "skip".

### Step CI-4: Write `project-profile.md`

Update `.atta/project/project-profile.md` with the answers from Step CI-3:

- Map CI-P1 → "Code Review Priorities" section (set `[x]` for selected, `[ ]` for unselected)
- Map CI-P2 → "Testing Approach" section
- Map CI-P3 → "Error Handling" section
- Map CI-P4 → "Naming Conventions" section (replace placeholder values with user's answer, or leave unchanged if skipped)
- Map CI-P5 → "Tech Stack Non-Negotiables" section (append user's exceptions as a list, or leave unchanged if skipped)

> Preserve all other sections unchanged. Only update the 5 sections answered in Step CI-3.

### Step CI-5: Offer to Regenerate `atta-review.yml`

Map CI-Q1 answer to the CLI command:

| Provider | Command |
|----------|---------|
| Anthropic direct | `atta init --adapter github-action` |
| AWS Bedrock | `atta init --adapter github-action --auth-backend bedrock` |
| GCP Vertex AI | `atta init --adapter github-action --auth-backend vertex` |
| OpenAI | `atta init --adapter github-action --provider openai` |
| Azure OpenAI | `atta init --adapter github-action --provider azure` |
| Ollama | `atta init --adapter github-action --provider ollama` |

If `self-hosted` runner: note user must edit `runs-on:` manually in the generated YAML.

Ask conversationally: show the computed command, ask "yes" to generate now or "no" for later. Do not execute it — tell the user to run it themselves.

### Step CI-6: Summary

Show what changed and next steps:
- `project-profile.md` updated with team conventions
- Provider selected: [name] → [CLI command]
- Commit: `git add .atta/project/project-profile.md .github/workflows/atta-review.yml`
- Setup checklist: add required secret to GitHub (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `AZURE_OPENAI_API_KEY` depending on provider; Ollama needs none), run `/atta` if not done, push to trigger first CI review

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Profile files not found | Suggest `/profile --update` or `npx atta-dev init` |
| `project-context.md` not found | Create minimal file with just `## Preferences`, suggest `/atta` for full setup |
| Profile has no checked items | Suggest `/profile --update` |
