# Model Targeting

**Added in**: v3.0.0

## Overview

Not every skill needs the most expensive model. Model targeting assigns each skill a recommended tier — so quick tasks like linting run on Haiku (~$0.01) while security audits use Opus for maximum capability.

## The Tier System

| Tier | Claude Code Model | Use Case | Skills |
|------|------------------|----------|--------|
| **Light** | Haiku | Deterministic, scripted, or simple tasks | `/atta`, `/atta-preflight`, `/atta-lint`, `/atta-agent`, `/atta-test`, `/atta-ship`, `/atta-update`, `/atta-patterns`, `/atta-migrate`, `/atta-profile`, `/atta-tutorial` |
| **Mid** | Sonnet | Code review, analysis, synthesis | `/atta-review`, `/atta-optimize`, `/atta-librarian`, `/atta-team-lead`, `/atta-route`, `/atta-checklist` (hidden) |
| **Full** | Opus | Security audit, multi-agent orchestration | `/atta-security-audit`, `/atta-collaborate` |

## How It Works

### 1. Model Registry (source of truth)

`.atta/team/model-registry.json` maps every skill to a tier and every tier to a model per tool:

```json
{
  "tiers": {
    "light": { "claude-code": "haiku", "copilot": "Claude Haiku 4.5 or GPT-5-mini", ... },
    "mid":   { "claude-code": "sonnet", ... },
    "full":  { "claude-code": "opus", ... }
  },
  "skills": {
    "atta-review": "mid",
    "atta-security-audit": "full",
    "atta-lint": "light"
  }
}
```

### 2. SKILL.md Frontmatter

Each skill has a `model:` field in its frontmatter:

```yaml
---
name: atta-review
description: Code review with automated pattern checks.
model: sonnet
---
```

Claude Code reads this natively. Other tools treat it as advisory metadata.

### 3. Model Gate Hook (enforcement)

Each tool uses a **tool-specific** model-gate hook script, because hook events and model detection differ across tools:

```
[model-gate] BLOCKED: /atta-lint is a light-tier skill but you're running on gpt-5.4 (full tier).
[model-gate] Switch to Claude Haiku 4.5 or GPT-5-mini or re-run with --bypass to override.
```

**How it works per tool:**

| Tool | Hook Script | Event | Model Detection | Tested With |
|------|------------|-------|-----------------|-------------|
| **Claude Code** | N/A — `model:` frontmatter routes natively | — | — | — |
| **Copilot** | `model-gate-copilot.sh` | `preToolUse` (via `userPromptSubmitted` relay) | `$COPILOT_MODEL` env var → `~/.copilot/config.json` | Copilot CLI v1.0.5 |
| **Gemini** | `model-gate-gemini.sh` | `BeforeModel` (has `llm_request.model`) | `llm_request.model` from hook stdin | Gemini CLI v0.33.1 |
| **Cursor** | `model-gate.sh` (generic) | `preToolUse` | `model` field from hook stdin JSON | Not working — skills are `.mdc` rules, not tool calls. Needs Cursor-specific approach. |
| **Codex** | N/A — only 2 experimental hook events, no `preToolUse` | — | — | OpenAI Codex v0.114.0 |

**Copilot implementation details:**

Copilot hooks don't expose the model name or skill context in a single event. The model-gate uses a two-step relay:
1. `userPromptSubmitted` → `skill-detect-copilot.sh` detects the skill name from the user's prompt and writes it to `.atta/local/.active-skill`
2. `preToolUse` → `model-gate-copilot.sh` reads the temp file, detects the model, and outputs `permissionDecision: deny` JSON to block if the model tier is too expensive

**Known limitation (Copilot):** When switching models via `/model` in-session, Copilot removes the `model` key from `~/.copilot/config.json` and does not set `$COPILOT_MODEL` in hook subprocesses. The hook cannot detect the model in this case and falls back to an advisory warning. For reliable enforcement, set `export COPILOT_MODEL=<model>` in your shell before launching Copilot CLI.

**Gemini implementation details:**

`BeforeModel` is the only Gemini hook event that exposes the model name (in `llm_request.model`). The hook scans `llm_request.messages` in reverse order to detect which skill is active. Hooks are configured in `.gemini/settings.json` (not `hooks.json` — Gemini CLI reads hooks from `settings.json`).

**Behavior:**
- **Blocks** when the current model tier exceeds the skill's recommended tier — the skill does not run
- **Falls back to advisory warning** when the model can't be detected
- **`--bypass` in skill args** skips the gate for that invocation
- **`ATTA_MODEL_GATE=off` env var** disables the gate globally (set in your shell profile to opt out entirely)

## Customizing

### Change a skill's tier

Edit `.atta/team/model-registry.json`:

```json
{
  "skills": {
    "atta-review": "full"
  }
}
```

Then re-run init to update SKILL.md frontmatter:
```bash
npx atta-dev init --update
```

### Update model names

When new models are released, update the `tiers` section:

```json
{
  "tiers": {
    "light": { "claude-code": "haiku-next", ... }
  }
}
```

Re-run init — done. No code changes needed.

## Cross-Tool Behavior

| Tool | Enforcement | Limitations |
|------|------------|-------------|
| **Claude Code** | Native `model:` frontmatter — routes to the correct model automatically | None |
| **Copilot** | `model-gate-copilot.sh` — blocks via `permissionDecision: deny` JSON | Model undetectable when switched via `/model` in-session (see above) |
| **Gemini** | `model-gate-gemini.sh` — blocks via `BeforeModel` event with `decision: deny` | None — model always available in `llm_request.model` |
| **Cursor** | Not working — skills are `.mdc` rules (context), not tool calls | Needs Cursor-specific hook approach; requires subscription to test model switching |
| **Codex** | Not supported — only 2 experimental hook events, no `preToolUse` | Hooks system is behind feature flag |

## Hook Profiles (`ATTA_HOOKS`)

Control enforcement level without editing hook scripts. Set the `ATTA_HOOKS` environment variable:

| Profile | Behavior |
|---------|----------|
| `strict` | All hooks active, no warnings suppressed (same as `standard` currently — reserved for future expansion) |
| `standard` (default) | All hooks active — model-gate blocks tier mismatches, pre-bash-safety blocks destructive commands |
| `minimal` | Only CRITICAL hooks run (pre-bash-safety). Model-gate and stop-quality-gate skip. |
| `off` | All enforcement hooks skip. Session tracking (if present) still runs. |

**Usage:**

```bash
# In your shell profile (~/.zshrc, ~/.bashrc):
export ATTA_HOOKS=minimal    # Only safety hooks, no model gating

# Or per-session:
ATTA_HOOKS=off npx atta-dev init   # Skip all enforcement during init
```

**Which hooks are affected:**

`ATTA_HOOKS` controls **command-type hooks** (bash scripts in `.atta/scripts/hooks/`). These are used by Copilot, Gemini, and partially by Cursor:

| Hook Script | `strict` / `standard` | `minimal` | `off` |
|-------------|----------------------|-----------|-------|
| `pre-bash-safety.sh` | Runs | Runs | Skips |
| `model-gate.sh` (Cursor) | Runs | Skips | Skips |
| `model-gate-copilot.sh` + `skill-detect-copilot.sh` | Runs | Skips | Skips |
| `model-gate-gemini.sh` | Runs | Skips | Skips |
| `agent-enforce.sh` | Runs | Skips | Skips |
| `stop-quality-gate.sh` | Runs | Skips | Skips |

**Claude Code and Cursor** use **prompt-type hooks** for safety and quality gates — these are AI-evaluated and not controlled by `ATTA_HOOKS`. The model-gate is a command-type hook on Copilot, Cursor, and Gemini and respects `ATTA_HOOKS` on those tools. Claude Code handles model routing natively via `model:` frontmatter.

| Hook | Copilot / Gemini | Cursor | Claude Code |
|------|-----------------|--------|-------------|
| Safety gate | Command script (profile-controlled) | Prompt hook (always active) | Prompt hook (always active) |
| Model gate | Command script (profile-controlled) | Command script (profile-controlled) | N/A (native `model:` frontmatter) |
| Quality gate | Command script (profile-controlled) | Prompt hook (always active) | Prompt hook (always active) |

> **Note:** `ATTA_MODEL_GATE=off` disables only the model gate. `ATTA_HOOKS=off` disables all command-type enforcement hooks. Use whichever fits your need.
>
> Unrecognized values (e.g., a typo like `ATTA_HOOKS=offf`) are treated as `standard` — fail-closed by design.

## Cost Impact

With model targeting, a typical daily workflow costs significantly less:

| Without targeting (all Sonnet) | With targeting |
|------|------|
| `/atta-lint` × 5 = ~$0.25 | `/atta-lint` × 5 = ~$0.05 (Haiku) |
| `/atta-review` × 3 = ~$0.30 | `/atta-review` × 3 = ~$0.18 (Sonnet) |
| `/atta-agent` × 10 = ~$0.60 | `/atta-agent` × 10 = ~$0.10 (Haiku) |
| **Total: ~$1.15/day** | **Total: ~$0.33/day** |

See [Token Usage](token-usage.md) for detailed per-skill estimates.

## Agent Enforcement

Beyond model targeting, Atta enforces agent-level constraints.

### disallowedTools

Agents define `disallowedTools:` in frontmatter (e.g., code-reviewer disallows Edit/Write/Bash). Enforcement varies by tool:

| Tool | Mechanism | Format |
|------|-----------|--------|
| **Claude Code** | Native frontmatter enforcement | Built-in — no hook needed |
| **Copilot** | `agent-enforce.sh` on `preToolUse` | `permissionDecision: deny` JSON |
| **Cursor** | Hook wired, but advisory until agent detection relay exists | Exit code 2 (when `.active-agent` present) |
| **Gemini** | Hook wired, but advisory until agent detection relay exists | Exit code 2 (when `.active-agent` present) |
| **Codex** | Advisory only (body text) | No enforcement hooks |

**Tool name normalization**: Agent frontmatter uses Claude-style names (`Edit`, `Write`, `Bash`). The enforcement script normalizes across adapters using `TOOL_ALIASES` (e.g., Cursor's `EditFile` → `Edit`, `Shell` → `Bash`).

### allowedFiles

Agents can define `allowedFiles:` in frontmatter to restrict file access by glob pattern. Enforcement is in `agent-enforce.sh` (same script as `disallowedTools`) — currently active on Copilot only; advisory on others until agent detection relays exist.

```yaml
---
name: test-writer
allowedFiles:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "__tests__/**/*"
---
```

### Convention Prompt Hooks

When frontend frameworks are detected, Atta generates prompt hooks that check:
- **Component naming**: PascalCase, correct directory, no duplicates (fires on `Write`/`CreateFile`) — Claude Code + Cursor
- **Import conventions**: Path aliases, import order, circular dependencies (fires on `Edit`/`Write`, TypeScript only) — Claude Code only

These are AI-evaluated (`type: "prompt"`). Other tools get equivalent guidance in their coding rules files (advisory).

## See Also

- [Token Usage & Cost](token-usage.md) — Per-skill token and cost estimates
- [Adapter Compatibility](adapter-compatibility.md) — Cross-tool feature matrix
