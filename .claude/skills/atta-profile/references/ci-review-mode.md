# CI Review Mode

> Architect/lead engineer mode. Configures CI provider settings and `project-profile.md` (team conventions). **Never touches `developer-profile.md`.**

## Step CI-1: Read Existing State

Read both files (if they exist) to pre-fill answers where possible:
- `.atta/project/project-profile.md`
- `.github/workflows/atta-review.yml`

Inform the user: "CI Review Setup — configures CI provider (action + auth) and project-profile (team conventions). Changes affect the whole team (committed files)."

## Step CI-2: Ask CI Configuration Questions

Use AskUserQuestion to ask the following questions. Each is independent — ask all that don't already have a clear answer from the existing `atta-review.yml`.

**Question CI-Q1 — AI Provider (page 1 of 2)**

> Which AI provider should the CI review workflow use?

Options:
- **Anthropic (direct)** — `claude-code-action`, uses `ANTHROPIC_API_KEY`
- **AWS Bedrock** — `claude-code-action` + IAM role, no API key stored
- **GCP Vertex AI** — `claude-code-action` + Workload Identity, no API key stored
- **Other providers ->** — OpenAI, Azure OpenAI, or Ollama

If "Other providers ->" is selected, immediately ask **CI-Q1 page 2**:

> Which provider?

Options:
- **OpenAI** — `appleboy/LLM-action` with OpenAI, uses `OPENAI_API_KEY`
- **Azure OpenAI** — `appleboy/LLM-action` with Azure, uses `AZURE_OPENAI_API_KEY`
- **Ollama (self-hosted)** — `appleboy/LLM-action` with local model, no API key needed
- **<- Back** — return to the previous question

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

## Step CI-3: Ask Project-Profile Questions

> These shape what the CI reviewer checks. They're team-level conventions, not personal preferences.

Ask the following. **Skip any section that already has a `[x]` in `project-profile.md`.**

**Question CI-P1 — Review Priorities** (multi-select, paginated)

Same 6 options as update mode Q3, but paginated (max 4 per AskUserQuestion):
- Page 1: Correctness and bugs, Security vulnerabilities, Readability and maintainability, "More priorities ->"
- Page 2 (if needed): Performance, Accessibility, Test coverage, "<- Done"

Accumulate selections from both pages.

**Question CI-P2 — Testing Approach** — Same options as complete mode C4.

**Question CI-P3 — Error Handling** — Same options as update mode Q5.

**Question CI-P4 — Naming Conventions** (free-text, conversational — not AskUserQuestion)

> Any team naming standards? (functions: camelCase/snake_case/PascalCase, constants: UPPER_SNAKE_CASE/camelCase, CSS: kebab-case/camelCase/BEM) — Type conventions or "skip".

**Question CI-P5 — Tech Stack Non-Negotiables** (free-text, conversational)

> **Tech stack non-negotiables** — Anything the CI reviewer should never flag as an issue?
> For example: "we use `any` types intentionally", "console.log is allowed in scripts", "tabs not spaces".
>
> Type your exceptions, or say "skip".

## Step CI-4: Write `project-profile.md`

Read `.atta/project/project-profile.md`. If it does not exist, create it from the template in `.atta/local/developer-profile.md` (same structure, empty checkboxes). Update with the answers from Step CI-3:

- Map CI-P1 -> "Code Review Priorities" section (set `[x]` for selected, `[ ]` for unselected)
- Map CI-P2 -> "Testing Approach" section
- Map CI-P3 -> "Error Handling" section
- Map CI-P4 -> "Naming Conventions" section (replace placeholder values with user's answer, or leave unchanged if skipped)
- Map CI-P5 -> "Tech Stack Non-Negotiables" section (append user's exceptions as a list, or leave unchanged if skipped)

> Preserve all other sections unchanged. Only update the 5 sections answered in Step CI-3.

## Step CI-5: Offer to Regenerate `atta-review.yml`

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

## Step CI-6: Summary

Show what changed and next steps:
- `project-profile.md` updated with team conventions
- Provider selected: [name] -> [CLI command]
- Commit: `git add .atta/project/project-profile.md .github/workflows/atta-review.yml`
- Setup checklist: add required secret to GitHub (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `AZURE_OPENAI_API_KEY` depending on provider; Ollama needs none), run `/atta` if not done, push to trigger first CI review
