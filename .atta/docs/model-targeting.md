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

The `model-gate.sh` hook runs before each skill invocation on Copilot, Cursor, and Gemini. It detects the current model and **blocks** skills running on a more expensive model than needed:

```
[model-gate] BLOCKED: /atta-lint is a light-tier skill but you're running on claude-opus-4-6 (full tier).
[model-gate] Switch to Claude Haiku 4.5 or GPT-5-mini or re-run with --bypass to override.
```

**How it detects the model:**

| Tool | Detection Method |
|------|-----------------|
| **Claude Code** | Not needed — `model:` frontmatter routes natively |
| **Copilot** | Reads `$COPILOT_MODEL` environment variable |
| **Cursor** | Reads `model` field from hook stdin JSON |
| **Gemini** | Reads `$GEMINI_MODEL` if set (falls back to advisory warning) |

**Behavior:**
- **Blocks (exit 2)** when the current model tier exceeds the skill's recommended tier — the skill does not run
- **Falls back to advisory warning** when the model can't be detected (e.g., Gemini without `$GEMINI_MODEL`)
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

| Tool | Behavior |
|------|----------|
| **Claude Code** | `model:` frontmatter routes to the correct model natively. No hook needed. |
| **Copilot** | `model-gate.sh` detects model via `$COPILOT_MODEL` and **blocks** if tier mismatch. |
| **Cursor** | `model-gate.sh` detects model from stdin JSON and **blocks** if tier mismatch. |
| **Gemini** | `model-gate.sh` reads `$GEMINI_MODEL` if set; blocks or falls back to advisory warning. |
| **Codex** | N/A — Codex uses its own model, no hook support. |

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
| `model-gate.sh` | Runs | Skips | Skips |
| `stop-quality-gate.sh` | Runs | Skips | Skips |
| `session-track.sh` | Runs | Runs | Runs |

**Claude Code and Cursor** use **prompt-type hooks** for safety and quality gates — these are AI-evaluated and not controlled by `ATTA_HOOKS`. The model-gate is a command-type hook on all tools and respects `ATTA_HOOKS` everywhere.

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

## See Also

- [Token Usage & Cost](token-usage.md) — Per-skill token and cost estimates
- [Adapter Compatibility](adapter-compatibility.md) — Cross-tool feature matrix
