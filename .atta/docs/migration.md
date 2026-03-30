# Migrating to v3.0

## Overview

v3.0 is a significant release with structural changes. If you're upgrading from v2.x, there are two paths depending on your situation.

## Quick Decision

| Situation | What to do |
|-----------|-----------|
| **New project** | `npx atta-dev init` — you get v3.0 from scratch |
| **Existing v2.7.x project** | Run `npx atta-dev init` then `/atta-migrate` |
| **Existing v2.6.x or older** | Run `npx atta-dev init` fresh (backup first) |

## What Changed in v3.0

### Breaking changes

1. **All skills renamed to `atta-*` namespace**
   - `/review` → `/atta-review`
   - `/collaborate` → `/atta-collaborate`
   - `/preflight` → `/atta-preflight`
   - `/agent` → `/atta-agent`
   - ... and all others (except `/atta` itself)

2. **Agent architecture: 4 core + 4 optional**
   - Core (always installed): project-owner, code-reviewer, librarian, architect
   - Optional (selected during init): business-analyst, qa-validator, pr-manager, rubber-duck

3. **New architect agent** replaces the design-time gap

4. **Rich agent frontmatter** — 14 fields including `tools`, `skills`, `permissionMode`, `maxTurns`

### Non-breaking additions

- Path-scoped coding rules (`.atta/team/rules/`)
- Model targeting (`model-registry.json`)
- Enforcement hooks (lint-on-edit, pre-bash safety, stop quality gate)
- Rules-aware CI review with OWASP scope
- Init absorption (parses existing tool config before install)

## Migration Steps

### Step 1: Update the framework (mechanical)

```bash
npx atta-dev init
```

This handles:
- File structure updates (new directories, moved files)
- Skill directory renames (`skills/review/` → `skills/atta-review/`)
- New files (model-registry.json, architect agent, hidden skills)

### Step 2: User content cleanup

```
/atta-migrate
```

`init` handles the heavy lifting (agents, hooks, model registry, architect). This skill handles what `init` can't — **renaming old skill references in user-edited files**:

- **Skill reference renames** — updates `/review` → `/atta-review` etc. in your config files, custom docs, and user content that `init` doesn't touch
- **Directory restructure verification** — confirms the team/local split completed
- **User customization recovery** — helps recover Project Rules and librarian additions from pre-migration agent files (via git history)
- **Completeness checks** — verifies all components are present, suggests re-running `init` if anything is missing

`/atta-migrate` is:
- **Safe** — backs up before changes
- **Dry-run first** — shows what will change before applying
- **Idempotent** — running it twice doesn't break anything

### Step 3: Verify

```
/atta-preflight
```

Run preflight to verify everything works. Check that your skills resolve, agents load, and pattern files are intact.

## What About My Customizations?

| What you customized | What happens |
|---|---|
| Agent definitions (tweaked rules, anti-patterns) | Preserved — `/atta-migrate` merges new fields, keeps your content |
| Pattern files | Untouched — these are user content |
| Developer profile | Untouched |
| Directives | Untouched — per-developer, not framework |
| Custom skills in `generated/` | Preserved — only framework skills renamed |
| `project-context.md` | Untouched |
| `ci-suppressions.md` | Untouched |

## Updating Muscle Memory

The biggest user-facing change is the skill namespace. Quick reference:

| Before (v2.x) | After (v3.0) |
|----------------|-------------|
| `/review` | `/atta-review` |
| `/collaborate` | `/atta-collaborate` |
| `/preflight` | `/atta-preflight` |
| `/agent react` | `/atta-agent react` |
| `/lint` | `/atta-lint` |
| `/ship` | `/atta-ship` |
| `/security-audit` | `/atta-security-audit` |
| `/test` | `/atta-test` |
| `/patterns` | `/atta-patterns` |
| `/profile` | `/atta-profile` |
| `/optimize` | `/atta-optimize` |
| `/librarian` | `/atta-librarian` |
| `/tutorial` | `/atta-tutorial` |
| `/team-lead` | `/atta-team-lead` |
| `/update` | `/atta-update` |
| `/migrate` | `/atta-migrate` |

**Why the rename?** Different AI tools have built-in commands that conflict with generic names like `/review` or `/agent`. The `atta-*` namespace prevents collisions across all adapters.

## See Also

- [Changelog](changelog.md) — Full v3.0.0 release notes
- [Updating](updating.md) — General update workflow
- [Adapter Compatibility](adapter-compatibility.md) — Cross-tool feature matrix
