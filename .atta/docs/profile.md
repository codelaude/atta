# Developer Profile

**Status**: Core feature (v2.7)

## Overview

The developer profile tells your AI team how you prefer to work. Instead of every agent guessing your style, you set preferences once and they propagate everywhere — collaboration approach, response format, review priorities, error handling, and more.

## Quick Start

```
/atta-profile             # View your current preferences
/atta-profile --update     # Set core preferences (5 questions, ~2 min)
/atta-profile --complete   # Extended preferences (3 rounds, ~5 min)
/atta-profile --apply      # Re-apply profile to project without changing answers
```

## How It Works

Profile preferences propagate through two layers:

1. **Runtime** — `/atta-profile --apply` writes a distilled `## Preferences` section to `project-context.md`. Every agent that reads project context picks up your preferences automatically.

2. **Generation-time** — When `/atta` generates agents, it reads your profile and appends a `## Developer Preferences` section to each agent file. This bakes preferences directly into agents with zero runtime cost.

Both layers are updated automatically:
- `/atta-profile --update` and `--complete` chain to `--apply` when done
- `/atta --rescan` re-applies the profile as part of regeneration

## What Gets Configured

### Core Preferences (`--update`)

| Preference | Options |
|-----------|---------|
| AI Collaboration | Guidance-first, Implementation-first, Balanced |
| Response Style | Concise, Detailed, Questions-first, Direct |
| Code Ownership | Review-ready, Learning-focused, Time-sensitive |
| Review Priorities | Correctness, Security, Readability, Performance, Accessibility, Tests |
| Error Handling | Defensive, Fast-fail, User-friendly, Developer-friendly |

### Extended Preferences (`--complete`)

| Preference | Options |
|-----------|---------|
| Exception Cases | When AI can write code directly (tests, configs, docs) |
| Output Format | Markdown, Inline code, Diffs, Step-by-step |
| Code Examples | Minimal, Complete, Reference-existing, Pseudocode |
| Testing Approach | TDD, Test-after, Critical-paths, High-coverage |
| Documentation | Inline-comments, JSDoc, README-per-module, Minimal |

### Auto-Detected (by `/atta`)

During project setup, `/atta` detects and pre-fills:
- **Naming Conventions** — camelCase, snake_case, etc. (from your code)
- **Documentation Style** — JSDoc, inline comments, etc. (from your code)

These are objective project facts, not personal preferences.

## Where Preferences Live

| File | Purpose | Who reads it |
|------|---------|-------------|
| `developer-profile.md` | Source of truth (all preferences) | `/atta-profile` skill only |
| `project-context.md` `## Preferences` | Distilled 3-5 line summary | All agents at runtime |
| Generated agent files `## Developer Preferences` | Baked into each agent | Each agent directly |

The full profile is **not** read at runtime by agents — only the distilled versions are. This keeps context usage minimal.

## Workflow

### First-time setup

```
npx atta-dev init        # CLI asks 5 core questions, pre-fills profile
/atta                    # Detects tech stack, generates agents with profile
/atta-profile --complete      # (Optional) Fill in extended preferences
```

### Updating preferences later

```
/atta-profile --update        # Change core preferences → auto-applies
/atta --rescan           # Regenerate agents with updated profile
```

### Just re-applying (no changes)

```
/atta-profile --apply         # Re-propagate existing profile to project-context.md
```

## Connection to `/atta`

- `/atta` Phase 2 auto-detects naming conventions and documentation style, writing them to `developer-profile.md`
- `/atta` Phase 4 reads the profile and injects `## Developer Preferences` into each generated agent
- `/atta --rescan` re-runs both: detection + profile propagation (including the `project-context.md` update)

## Example Output

After running `/atta-profile --apply`, your `project-context.md` gains:

```markdown
## Preferences

- **Style**: Balanced collaboration, concise responses
- **Reviews**: Focus on correctness, security, readability
- **Approach**: Review-ready code ownership, fast-fail error handling
- **Workflow**: TDD testing, minimal docs, markdown + diffs output
- **AI direct-write OK**: tests, configs
```

And each generated agent file includes:

```markdown
## Developer Preferences

- **Response style**: concise
- **Collaboration**: balanced
- **Code ownership**: review-ready
- **Review priorities**: correctness, security, readability
- **Error handling**: fast-fail
```
