---
name: update
description: Check for and apply framework updates while preserving user customizations. Smart merge system that separates framework files from user content.
---

You are running the **update** skill to manage framework updates for the `.claude/` system.

## How to Use

```bash
/update check --from ./.claude_staging/.claude
/update pull --dry-run --from ./.claude_staging/.claude
/update pull --from ./.claude_staging/.claude
/update pull --interactive --from ./.claude_staging/.claude
/update pull --from ./.claude_staging/.claude --mode upgrade
/update pull --from ./.claude_staging/.claude --mode migration
/update pull --from ./.claude_staging/.claude --mode migration-bootstrap
/update rollback
/update --history
```

### Source Acquisition (Required for check/pull)

```bash
git clone --depth 1 https://github.com/codelaude/atta-prime.git .claude_staging
```

Never manually copy a new `.claude/` folder over your existing one.

### Mode Selection

- Default: auto-selects from metadata:
  - `upgrade` when `.atta/.metadata/file-manifest.json` exists
  - `migration-bootstrap` when it is missing
- Override: `--mode upgrade|migration|migration-bootstrap`

---

## What This Skill Does

1. Load source from `--from <staging>/.claude`
2. Auto-select mode from metadata
3. Classify files into tiers (see File Classification)
4. Detect customizations, apply safe updates, merge customized files
5. Preserve all user content
6. Report what changed

---

## Prerequisites

1. `--from` path provided for check/pull, must contain `.metadata/version`
2. Optional `--mode` override is valid
3. Clean working directory (no uncommitted `.claude/` changes)
4. `.atta/.metadata/framework-version` used for comparison (created by `/atta`)

---

## File Classification

### Tier 1: Safe to Replace (no user customizations)

Patterns: `bootstrap/**/*`, `docs/**/*`, `skills/*/SKILL.md` (except `skills/generated/`), `knowledge/templates/**/*`, `.metadata/README.md`

### Tier 2: Requires Merge (framework files with user customizations)

Files: `agents/project-owner.md`, `agents/librarian.md`, `agents/rubber-duck.md`, `agents/code-reviewer.md`, `agents/business-analyst.md`, `agents/qa-validator.md`, `agents/pr-manager.md`

### Tier 3: Never Touch (pure user content)

Patterns: `agents/memory/**/*`, `project/**/*`, `knowledge/accs/**/*`, `agents-config.json`, `settings.local.json`, `.metadata/file-manifest.json`, `.metadata/framework-version`, `.metadata/update-history.json`

Backup directories (`.claude-backup-*`) are created as siblings outside `.claude/`.

### Generated (Optional Update)

Patterns: `agents/coordinators/**/*`, `agents/specialists/**/*`, `knowledge/patterns/**/*`, `agents/INDEX.md`, `.metadata/generated-manifest.json`, `.metadata/last-init`, `skills/generated/**/*`

Run `/atta --rescan` after update to regenerate from new templates.

---

## Phase 1: Check for Updates

When user runs `/update check`:

### 1.1. Verify Prerequisites

```bash
# Check source path exists and has .metadata/version
# Determine mode: --mode override > manifest check > migration-bootstrap fallback
```

Read versions from:
- `.atta/.metadata/version` — current version
- `.atta/.metadata/framework-version` — last applied framework version
- `$SOURCE_CLAUDE_DIR/.metadata/version` — incoming version

### 1.2. Report

Show: current vs latest version, feature highlights from changelog, suggest `--dry-run`. If up to date, say so.

---

## Phase 2: Dry Run (`--dry-run`)

### 2.1. Classify and Compare

- Read `.atta/.metadata/file-manifest.json` for file hashes and categories
- For Tier 1: compare hashes, list changed files
- For Tier 2: detect customizations, show diff, recommend merge strategy
- Tier 3: list as preserved

### 2.2. Generate Report

Show per-tier summary: Tier 1 files to replace (with counts), Tier 2 files needing merge (with customization details), Tier 3 preserved files, generated files (suggest `/atta --rescan`). End with next steps: `/update pull` or `--interactive`.

---

## Phase 3: Apply Updates (`/update pull`)

### 3.1. Create Backup

```bash
timestamp=$(date +%Y%m%d-%H%M%S)
backup_dir=".claude-backup-update-v{{CURRENT_VERSION}}-to-v{{NEW_VERSION}}-$timestamp"
cp -r .claude/ "$backup_dir/"
```

### 3.2. Apply Tier 1 (Safe Replace)

Copy new versions from framework, update hashes in manifest, log updates.

### 3.3. Apply Tier 2 (Smart Merge)

**Strategy A — No Customizations:** Simply replace with new version.

**Strategy B — Customizations Detected:**
1. Extract user customizations (personality names, added rules, modified sections, `## Project Rules` sections)
2. Apply framework update (get new template)
3. Reapply customizations (merge back in)
4. Show diff and ask for approval

> **`## Project Rules` sections** are user-owned content promoted from scoped directives via `/patterns promote --directives`. They must be extracted before update and reapplied after, same as personality names and added rules. Never overwrite or remove them.

**Strategy C — Interactive Mode (`--interactive`):**
Show side-by-side diff for each file. User chooses: (a) accept + reapply, (b) keep yours, (c) manual edit.

### 3.4. Update Metadata

Write updated `.metadata/framework-version`, `.metadata/file-manifest.json` (with new hashes), and `.metadata/update-history.json` (append entry with from/to/timestamp/counts/backup location).

---

## Phase 4: Report Results

Show: version transition, counts (updated/merged/preserved), backup location, next steps (`/atta --rescan`, `git diff .claude/`, `/update rollback`).

---

## Phase 5: Rollback (`/update rollback`)

1. Find latest `.claude-backup-update-*` directory (sibling to `.claude/`)
2. Confirm with user (show from/to versions, warn that post-update changes will be lost)
3. Create safety backup of current state: `cp -r .claude/ ".claude-pre-rollback-backup-$timestamp/"`
4. Restore from update backup: `rm -rf .claude/ && cp -r <backup>/ .claude/`
5. Report: restored version, safety backup location

---

## Phase 6: Update History (`/update --history`)

Read `.metadata/update-history.json` and display each entry: from → to version, timestamp, file counts, backup location, notes. Include migration entries if present.

---

## Smart Merge Algorithm

For Tier 2 files: detect user customizations → get new framework template → reapply customizations (YAML frontmatter, special sections, `## Project Rules`, or 3-way merge) → validate → show diff.

User-owned sections in Tier 2 agent files (extract before update, reapply after):
- Personality names (custom agent names)
- Added rules within existing sections
- `## Project Rules` — promoted directives from `/patterns promote --directives`

---

## Error Handling

| Error | Recovery |
|-------|----------|
| File manifest missing | Auto-switch to Migration Bootstrap mode, suggest `--dry-run` first |
| Merge conflict | Options: keep framework + reapply (recommended), keep yours, manual merge |
| No backup space | Free disk space and retry |
