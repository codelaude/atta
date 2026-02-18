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
git clone --depth 1 <framework-repo-url> .claude_staging
```

Never manually copy a new `.claude/` folder over your existing one.

### Mode Selection

- Default: `/update` auto-selects mode from metadata:
  - `upgrade` when `.claude/.metadata/file-manifest.json` exists
  - `migration-bootstrap` when `.claude/.metadata/file-manifest.json` is missing
- Optional override: `--mode` with one of:
  - `upgrade`
  - `migration`
  - `migration-bootstrap`

---

## What This Skill Does

1. **Load source** framework from `--from <staging>/.claude`
2. **Select mode automatically** from metadata (Upgrade vs Migration Bootstrap)
3. **Classify** files into framework/generated/user categories
4. **Detect** customizations to framework files
5. **Apply** safe updates (bootstrap, docs, core skills)
6. **Merge** customized framework files (core agents)
7. **Preserve** all user content (project knowledge, directives, settings)
8. **Report** selected mode and what changed

---

## Prerequisites

Before running `/update`, ensure:

1. **Source path is provided** with `--from` for check/pull operations
   - Example: `--from ./.claude_staging/.claude`
   - Source path must contain `.metadata/version`

2. **Optional mode override** is valid when provided
   - `--mode upgrade|migration|migration-bootstrap`

3. **Clean working directory**: No uncommitted changes to `.claude/`
   - The update creates backups, but start clean for safety

4. **Framework version tracking file**: `.claude/.metadata/framework-version` is used for reporting/comparison
   - Created automatically by `/init` in new projects
   - Legacy installs may be missing this file; `/update` should recreate/update it during apply

---

## Phase 1: Check for Updates

When user runs `/update check`:

### 1.1. Verify Prerequisites

```bash
# Check source path
if [ -z "${SOURCE_CLAUDE_DIR:-}" ]; then
  echo "⚠️  Missing source path"
  echo "Use: /update check --from ./.claude_staging/.claude"
  exit 1
fi

if [ ! -f "$SOURCE_CLAUDE_DIR/.metadata/version" ]; then
  echo "⚠️  Invalid source path: $SOURCE_CLAUDE_DIR"
  echo "Expected: $SOURCE_CLAUDE_DIR/.metadata/version"
  exit 1
fi

# Determine mode (upgrade vs migration bootstrap)
if [ -n "${MODE_OVERRIDE:-}" ]; then
  case "$MODE_OVERRIDE" in
    upgrade|migration|migration-bootstrap)
      mode="$MODE_OVERRIDE"
      echo "ℹ️  Mode forced by --mode: $mode"
      ;;
    *)
      echo "⚠️  Invalid mode: $MODE_OVERRIDE"
      echo "Use one of: upgrade, migration, migration-bootstrap"
      exit 1
      ;;
  esac
elif [ ! -f .claude/.metadata/file-manifest.json ]; then
  mode="migration-bootstrap"
  echo "ℹ️  file-manifest missing: /update will run Migration Bootstrap mode"
else
  mode="upgrade"
fi
```

### 1.2. Detect Current Versions

Read version information:
- `.claude/.metadata/version` → Target user's current version (e.g., "2.0")
- `.claude/.metadata/framework-version` → Target last applied framework version
- `$SOURCE_CLAUDE_DIR/.metadata/version` → Incoming source framework version
- `.claude/.metadata/file-manifest.json` → File tracking data (if present)

### 1.3. Resolve Mode

Resolve mode as follows (unless `--mode` override is provided):
- **Migration Bootstrap mode** (`migration-bootstrap`): auto-selected when `.claude/.metadata/file-manifest.json` is missing
- **Upgrade mode** (`upgrade`): default when manifest exists
- **Migration mode** (`migration`): explicit override only via `--mode migration`

### 1.4. Report Available Updates

```markdown
## Framework Update Available

**Current version**: 2.0
**Latest version**: 2.1
**Released**: 2026-02-16

### What's New in v2.1
- `/update` skill for safe framework updates
- File tracking system with smart merge
- Preserves all customizations during updates
- Update history and rollback support
- Opt-in for existing v2.0 projects

### Impact Analysis
Run `/update pull --dry-run` to see what would change.
```

If already up to date:
```
✅ You're on the latest framework version (2.1)
```

---

## Phase 2: Dry Run Mode (`--dry-run`)

When user runs `/update pull --dry-run`:

### 2.1. Load File Manifest

Read `.claude/.metadata/file-manifest.json` to understand:
- Which files are framework vs user vs generated
- Which framework files have been customized
- File hashes for comparison

### 2.2. Classify All Files

Group files into three tiers:

**Tier 1: Safe to Replace** (no user customizations)
```yaml
safe_replace:
  - bootstrap/**/*
  - docs/**/*
  - skills/init/SKILL.md
  - skills/migrate/SKILL.md
  - skills/agent/SKILL.md
  - skills/librarian/SKILL.md
  - skills/lint/SKILL.md
  - skills/review/SKILL.md
  - skills/preflight/SKILL.md
  - skills/security-audit/SKILL.md
  - skills/team-lead/SKILL.md
  - skills/update/SKILL.md
  - skills/tutorial/SKILL.md
  - knowledge/templates/**/*
```

**Tier 2: Requires Merge** (framework files with user customizations)
```yaml
merge_required:
  - agents/project-owner.md (customized: true)
  - agents/librarian.md (customized: true)
  - agents/rubber-duck.md (customized: true)
  - agents/code-reviewer.md (customized: true)
  - agents/business-analyst.md (customized: true)
  - agents/qa-validator.md (customized: true)
  - agents/pr-manager.md (customized: true)
```

**Tier 3: Never Touch** (pure user content)
```yaml
never_touch:
  - agents/memory/**/*
  - agents/legacy/**/*
  - knowledge/project/**/*
  - knowledge/accs/**/*
  - agents-config.json    # Optional user file (may not exist in all projects)
  - settings.local.json
  - .metadata/file-manifest.json
  - .metadata/framework-version
  - .metadata/update-history.json

note: "Backup directories (.claude-backup-*) are created as siblings outside .claude/"
```

**Generated (Optional Update)**
```yaml
regenerate_optional:
  - agents/coordinators/**/*
  - agents/specialists/**/*
  - knowledge/patterns/**/*
  - agents/INDEX.md
  note: "Run /init --rescan to regenerate from updated templates"
```

### 2.3. Compare File Contents

For Tier 1 files:
- Compare hash with framework version
- List which files changed and brief description

For Tier 2 files:
- Detect customizations (personality names, added rules, modified sections)
- Show diff highlighting user changes vs framework changes
- Recommend merge strategy

### 2.4. Generate Report

```markdown
## Update Preview (Dry Run)

### Tier 1: Safe Updates (will replace)
✓ bootstrap/detection/frontend-detectors.yaml (15 new detectors added)
✓ bootstrap/mappings/mcp-mappings.yaml (Context7, Serena support)
✓ bootstrap/templates/agents/*.template.md (clearer boundaries)
✓ docs/bootstrap-system.md (improved examples)
✓ docs/extending.md (new section on custom MCPs)
✓ skills/init/SKILL.md (better error handling)

**Total**: 23 files will be updated

### Tier 2: Requires Merge (you customized these)
⚠ agents/project-owner.md
  Framework changes: Improved routing logic, better error messages
  Your customizations: Custom personality, modified role description
  Strategy: 3-way merge (will preserve your changes)

⚠ agents/librarian.md
  Framework changes: Enhanced directive capture format
  Your customizations: None detected (can safely update)

**Total**: 2 files need review

### Tier 3: Will Preserve (your content)
✓ agents/memory/directives.md
✓ knowledge/project/* (8 files)
✓ knowledge/accs/* (3 files)
✓ agents-config.json
✓ settings.local.json

**Total**: 14 files protected

### Generated Files (optional)
? agents/coordinators/* (2 files)
? agents/specialists/* (5 files)
? knowledge/patterns/* (8 files)

Note: Run /init --rescan after update to regenerate from new templates

---

## Next Steps

To apply this update:
- `/update pull` - Apply automatically (safe updates + smart merge)
- `/update pull --interactive` - Review each merge manually
```

---

## Phase 3: Apply Updates (`/update pull`)

When user runs `/update pull`:

### 3.1. Create Backup

```bash
timestamp=$(date +%Y%m%d-%H%M%S)
backup_dir=".claude-backup-update-v2.0-to-v2.1-$timestamp"

# Backup entire .claude directory (as sibling, not subdirectory)
cp -r .claude/ "$backup_dir/"
echo "✓ Backup created: $backup_dir"
```

### 3.2. Apply Tier 1 Updates (Safe Replace)

For each file in the safe replace list:
1. Copy new version from framework
2. Update file hash in manifest
3. Log the update

```bash
# Example for bootstrap files
cp -r /path/to/framework/.claude/bootstrap/* .claude/bootstrap/
echo "✓ Updated bootstrap/ (23 files)"
```

### 3.3. Apply Tier 2 Updates (Smart Merge)

For each customized framework file:

**Strategy A: No Customizations Detected**
- Simply replace with new version
- Update hash in manifest

**Strategy B: Customizations Detected**

1. **Extract user customizations**:
   - Personality names or aliases
   - User-added rules sections
   - Modified role descriptions

2. **Apply framework update**:
   - Get new template version
   - Apply framework changes

3. **Reapply customizations**:
   - Merge user customizations back in
   - Use YAML front matter or special sections for user content

4. **Show diff and ask for approval**:
   ```markdown
   ## Merging agents/project-owner.md

   Framework changes applied:
   + Improved routing logic (lines 45-67)
   + Better error messages (lines 89-92)

   Your customizations preserved:
   ✓ Custom role description (lines 15-18)
   ✓ Project-specific routing rules (lines 70-75)

   [Show full diff? y/n]
   ```

**Strategy C: Interactive Mode**

If `--interactive` flag:
- Show side-by-side diff for each file
- Let user choose:
  - (a) Accept framework version + reapply customizations
  - (b) Keep your version (skip framework update)
  - (c) Manual edit (open in editor)

### 3.4. Skip Tier 3 Files

Do not touch:
- `agents/memory/**/*`
- `knowledge/project/**/*`
- `knowledge/accs/**/*`
- `agents-config.json`
- `settings.local.json`

Log that these were preserved.

### 3.5. Update Metadata

Write updated tracking files:

**`.metadata/framework-version`**:
```
2.1
```

**`.metadata/file-manifest.json`**:
```json
{
  "framework_version": "2.1",
  "user_version": "2.1",
  "last_update": "2026-02-16T14:30:00Z",
  "files": {
    "bootstrap/": {
      "source": "framework",
      "customized": false,
      "framework_hash": "new_hash_xyz"
    },
    "agents/project-owner.md": {
      "source": "framework",
      "customized": true,
      "framework_hash": "new_hash_abc",
      "user_hash": "user_hash_def",
      "customizations": {
        "sections_modified": ["role_description"],
        "user_rules_added": false
      }
    }
  }
}
```

**`.metadata/update-history.json`**:
```json
{
  "updates": [
    {
      "from": "2.0",
      "to": "2.1",
      "timestamp": "2026-02-16T14:30:00Z",
      "files_updated": 23,
      "files_merged": 2,
      "files_preserved": 14,
      "backup_location": ".claude-backup-update-v2.0-to-v2.1-20260216-143000",
      "notes": "Update system with file tracking and smart merge"
    }
  ]
}
```

---

## Phase 4: Report Results

```markdown
## ✅ Update Complete: v2.0 → v2.1

### What Changed

**Framework Files Updated** (23 files)
- bootstrap/ - Improved tech detection (15 new detectors)
- docs/ - New MCP setup guides
- skills/init/ - Better error handling and detection logic
- knowledge/templates/ - Enhanced PR template

**Merged With Your Customizations** (2 files)
- agents/project-owner.md ✓
- agents/librarian.md ✓

**Preserved** (14 files)
- agents/memory/directives.md
- knowledge/project/* (8 files)
- knowledge/accs/* (3 files)
- agents-config.json
- settings.local.json

### Backup Location
`.claude-backup-update-v2.0-to-v2.1-20260216-143000/`

### Next Steps

1. **Regenerate agents** (optional):
   ```
   /init --rescan
   ```
   This regenerates coordinators/specialists/patterns from updated templates.

2. **Review changes**:
   ```
   git diff .claude/
   ```

3. **Rollback** (if needed):
   ```
   /update rollback
   ```

### What's New in v2.1

- `/update` skill for safe framework updates
- File tracking system (file-manifest.json)
- Smart merge preserves customizations
- Update history and rollback support
- Three-tier file classification (framework/generated/user)
- Automatic backups before every update

---

**Framework version**: 2.1
**Last updated**: 2026-02-16 14:30:00
```

---

## Phase 5: Rollback (`/update rollback`)

When user runs `/update rollback`:

### 5.1. Find Latest Update Backup

Look for `.claude-backup-update-*` directories (sibling to .claude/), sorted by timestamp.

### 5.2. Confirm with User

```markdown
## Rollback Update

Found recent update backup:
- **From**: v2.0
- **To**: v2.1
- **Date**: 2026-02-16 14:30:00
- **Backup**: .claude-backup-update-v2.0-to-v2.1-20260216-143000/

This will restore your `.claude/` directory to the state before the update.

**⚠️  Any changes made AFTER the update will be lost.**

Proceed with rollback? [y/N]
```

### 5.3. Restore Backup

```bash
# Create safety backup of current state (as sibling directory)
timestamp=$(date +%Y%m%d-%H%M%S)
cp -r .claude/ ".claude-pre-rollback-backup-$timestamp/"

# Restore from update backup
rm -rf .claude/
cp -r .claude-backup-update-v2.0-to-v2.1-20260216-143000/ .claude/

echo "✓ Rollback complete"
echo "✓ Current state backed up to: .claude-pre-rollback-backup-$timestamp/"
```

### 5.4. Report

```markdown
## ✅ Rollback Complete

Restored from backup:
- `.claude-backup-update-v2.0-to-v2.1-20260216-143000/`

Framework version:
- **Was**: 2.1
- **Now**: 2.0

Your current state before rollback was saved to:
- `.claude-pre-rollback-backup-20260216-143500/`

You can now continue working on framework v2.0.
```

---

## Phase 6: Update History (`/update --history`)

Show complete update history:

```markdown
## Update History

### v2.0 → v2.1 (2026-02-16 14:30:00)
- Files updated: 23
- Files merged: 2
- Files preserved: 14
- Backup: `.claude-backup-update-v2.0-to-v2.1-20260216-143000/`
- Notes: Update system with file tracking and smart merge

### v1.0 → v2.0 (2026-01-10 09:15:00) [Migration]
- Migrated from v1.0 to v2.0 bootstrap system
- Generated 7 specialists, 2 coordinators
- Preserved 5 custom rules from legacy agents
- Backup: `.claude-backup-migrate-v1.0-to-v2.0-20260110-091500/`

---

**Current version**: 2.1
**Framework version**: 2.1
**Last update**: 2026-02-16 14:30:00
```

---

## File Classification Rules

Use these rules to determine file tier:

### Tier 1: Safe to Replace

```python
SAFE_REPLACE_PATTERNS = [
    "bootstrap/**/*",
    "docs/**/*",
    "skills/*/SKILL.md",  # Except generated/
    "knowledge/templates/**/*",
    ".metadata/README.md",
]

SAFE_REPLACE_EXCLUDE = [
    "skills/generated/**/*",
]
```

### Tier 2: Requires Merge

```python
MERGE_REQUIRED = [
    "agents/project-owner.md",
    "agents/librarian.md",
    "agents/rubber-duck.md",
    "agents/code-reviewer.md",
    "agents/business-analyst.md",
    "agents/qa-validator.md",
    "agents/pr-manager.md",
]
```

### Tier 3: Never Touch

```python
NEVER_TOUCH_PATTERNS = [
    "agents/memory/**/*",
    "agents/legacy/**/*",
    "knowledge/project/**/*",
    "knowledge/accs/**/*",
    "agents-config.json",
    "settings.local.json",
    ".metadata/file-manifest.json",
    ".metadata/framework-version",
    ".metadata/update-history.json",
]

# Note: Backup directories are outside .claude/ so not included here
```

### Generated (Optional)

```python
GENERATED_PATTERNS = [
    "agents/coordinators/**/*",
    "agents/specialists/**/*",
    "knowledge/patterns/**/*",
    "agents/INDEX.md",
    ".metadata/generated-manifest.json",
    ".metadata/last-init",
    "skills/generated/**/*",
]
```

---

## Smart Merge Algorithm

For Tier 2 files with customizations:

### Step 1: Detect Customizations

Compare current file against original framework template:
- Calculate diff
- Identify user-added sections
- Extract customizations (personality names, rules, etc.)

### Step 2: Apply Framework Update

Get new framework template version.

### Step 3: Reapply Customizations

Strategies:
1. **YAML front matter**: Store user data in front matter
2. **Special sections**: `## User Customizations` section
3. **Line-by-line merge**: Git-style 3-way merge

### Step 4: Validate Result

Ensure:
- All user customizations preserved
- Framework improvements applied
- No conflicts introduced
- File still valid markdown

### Step 5: Show Diff

Present to user:
- What framework changed
- What user customizations were preserved
- Final merged result

---

## Error Handling

### If File Manifest Missing

```markdown
ℹ️  Update tracking metadata not initialized

`.claude/.metadata/file-manifest.json` is missing.

`/update` will continue in **Migration Bootstrap mode** to initialize tracking metadata,
then proceed with normal update safety rules.

Recommended flow:
1. `/update pull --dry-run --from ./.claude_staging/.claude`
2. `/update pull --from ./.claude_staging/.claude`
```

### If Merge Conflicts

```markdown
⚠️  Merge conflict detected

File: agents/project-owner.md

The framework update conflicts with your customizations.

Options:
1. Keep framework version + reapply your customizations [recommended]
2. Keep your version (skip framework update)
3. Manual merge (show diff and let me edit)

Choose option [1/2/3]:
```

### If No Backup Space

```markdown
⚠️  Cannot create backup

Insufficient disk space to create backup before update.
Required: 50 MB
Available: 10 MB

Please free up space and try again.
```

---

## Implementation Notes

### For the Framework Maintainer

When releasing a new framework version:

1. **Update version file**:
   ```bash
   echo "2.1" > .claude/.metadata/version
   ```

2. **Document changes**:
   Create `.claude/.metadata/changelog-2.1.md` with:
   - What changed
   - Breaking changes (if any)
   - Migration notes
   - New features

3. **Test update path**:
   - Test on clean v2.0 → v2.1
   - Test on customized v2.0 → v2.1
   - Test rollback

4. **Tag release**:
   ```bash
   git tag -a v2.1 -m "Framework v2.1: Improved detection & MCP support"
   git push origin v2.1
   ```

### For Users

Update workflow:
1. `cd /path/to/your/project`
2. `git clone --depth 1 <framework-repo-url> .claude_staging`
3. `/update check --from ./.claude_staging/.claude`
4. `/update pull --dry-run --from ./.claude_staging/.claude`
5. `/update pull --from ./.claude_staging/.claude`
6. `/init --rescan` - Regenerate agents (optional)

---

_Update Skill v2.3 — Safe framework updates that preserve your customizations_
