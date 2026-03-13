---
name: optimize
description: Enrich prompts with project context for better results. Use within the current session to rephrase a question that didn't get a good answer, or to prepare prompts for other AI tools (Codex, Copilot, ChatGPT, Gemini) with full project context.
argument-hint: "<prompt> [--rephrase] [--target codex|copilot|chatgpt|gemini|claude]"
---

You are running the **Prompt Optimizer** — a context enrichment tool that makes prompts more effective.

## How to Use

```
/optimize <prompt>                          # Enrich for use in the current session
/optimize --rephrase <prompt>              # Rephrase a prompt that didn't get a good result
/optimize --target codex <prompt>           # Optimize for Codex
/optimize --target copilot <prompt>         # Optimize for Copilot
/optimize --target chatgpt <prompt>         # Optimize for ChatGPT
/optimize --target gemini <prompt>          # Optimize for Gemini
/optimize --target claude <prompt>          # Optimize for another Claude instance
```

### Two Main Use Cases

1. **Same-session optimization** (default) — Rephrase or restructure a prompt to get better results right here. Useful when the first attempt didn't produce what you wanted, or when you want to approach a problem from a different angle with better context.

2. **Cross-tool handoff** (`--target`) — Inject project context into a prompt so another AI tool can work effectively without access to your project.

---

## Step 1: Parse Input

Extract from the command arguments:

| Field | Source | Default |
|-------|--------|---------|
| **Mode** | `--target <tool>` or `--rephrase` flag | `same-session` |
| **Raw prompt** | Everything after flags | (required) |

**Modes:**
- No flags or `--rephrase` → **same-session**: enrich the prompt with project context and present a restructured version the user can use in this conversation
- `--target <tool>` → **cross-tool**: format for the specified external tool

If no prompt is provided, ask the user what they want to accomplish.

If `--rephrase` is used, also check the recent conversation context — the user likely got an unsatisfying response and wants to try a different angle.

---

## Step 2: Load Project Context

Read these files to build the enrichment context:

1. **`.atta/project/project-context.md`** (required)
   - Tech stack, key paths, build commands, git workflow
   - Architectural patterns (if `## Architectural Patterns` section exists)
   - Preferences (if `## Preferences` section exists)

2. **Pattern files** (selective — only the ones relevant to the prompt's domain)
   - Determine which patterns apply from the prompt content (e.g., a React task → read `patterns/react-patterns.md`)
   - Read at most 2 pattern files — distill to key rules, don't dump full contents

3. **`.atta/local/developer-profile.md`** (optional, personal — gitignored)
   - If it exists and has checked preferences, extract response style and personal code preferences
4. **`.atta/project/project-profile.md`** (optional, team — committed)
   - If it exists and has checked preferences, extract review priorities and team conventions

If `project-context.md` does not exist, inform the user: "No project context found. Run `/atta` first to detect your tech stack and generate project context."

---

## Step 3: Determine Relevant Context

Not all context is useful for every prompt. Select what to inject based on the task:

| Task Signal | Context to Include |
|-------------|-------------------|
| Mentions files, paths, directories | Key Paths section |
| Involves writing/modifying code | Tech stack + conventions + relevant pattern rules |
| Involves project structure or organization | Architectural patterns |
| Involves running, building, or testing | Build commands |
| Involves code review or quality | Preferences + conventions |
| General question about the project | Tech stack summary only |

**Always include**: Tech stack (1-3 lines). This is the minimum context for any enrichment.

**Never include**: Internal Atta routing, agent definitions, session data, secrets, or environment-specific paths.

---

## Step 4: Adapt to Mode

Apply mode-specific formatting:

### Same-Session (default / `--rephrase`)
Natural conversational tone. If `--rephrase`: analyze what went wrong, suggest different angle or decomposition.

### Cross-Tool Formatting
| Target | Key Adjustments |
|--------|----------------|
| Codex | Explicit instructions, file paths, numbered constraints. Has repo access — focus on conventions. |
| Copilot | Concise. Has repo context — focus on what code can't convey. |
| ChatGPT / Gemini | Self-contained. Full stack, versions, code examples. No project access. |
| Claude | Include project-context summary + relevant pattern files + style prefs. |
| Generic | Fully self-contained with default structure. |

---

## Step 5: Build Enriched Prompt

Construct the enriched prompt following this structure (adapt section names for target tool):

```markdown
## Context
[Distilled project context — tech stack, architecture, conventions. 5-15 lines max.]

## Task
[Original prompt, clarified if needed. Preserve the user's intent exactly.]

## Constraints
[Relevant conventions, anti-patterns to avoid, style preferences. Only what applies to this task.]

## Expected Output
[What the response should include — files to create/modify, format, scope.]
```

**Guidelines:** Context max 15 lines (distill, don't dump). Preserve user's intent. 3-8 constraints typical. Infer expected output from task.

---

## Step 6: Present & Refine

Display enriched prompt in a fenced code block for easy copying. Add brief summary of what was injected and for which target. Offer to adjust detail level, change target, or add constraints.

---

## Error Handling

| Error | Recovery |
|-------|----------|
| No project-context.md | "Run `/atta` first to generate project context." |
| Prompt too vague to determine relevant context | Ask clarifying question: "What area of the project does this task involve?" |
| No pattern files found | Proceed with project-context.md only — patterns are optional enrichment |
| Target tool not recognized | Treat as `generic`, mention supported targets |

---

## Related Skills

- `/atta` — Generates the project context that `/optimize` reads
- `/profile` — Sets preferences that `/optimize` injects into prompts
- `/agent prompt-engineer` — The underlying agent (invoked directly for custom workflows)

---

_Prompt optimization and cross-tool context enrichment_
