---
name: atta-migrate
description: Migrate older Atta installations to the current version — skill reference renames, directory restructure verification, and user content preservation. Shows diff before applying.
argument-hint: "[--dry-run] [--rollback]"
---

You are running the **migrate** skill to complete an Atta version upgrade.

## How to Use

```
/atta-migrate              Full migration (interactive, shows diff before applying)
/atta-migrate --dry-run    Show what would change without applying
/atta-migrate --rollback   Restore from backup
```

## What This Skill Does

`npx atta init --adapter <tool>` handles the heavy lifting: directory restructure, agent installation (in the correct per-adapter format), hooks, gitignore, model registry, and architect agent creation.

This skill handles what `init` cannot: **renaming old skill references** in user-edited files. These are files that `init` doesn't touch — config files, custom documentation, and user content that references old skill names like `/review` instead of `/atta-review`.

Additionally, this skill:
- Verifies the directory restructure completed correctly
- Helps recover user customizations (Project Rules, librarian additions) that may have been in pre-migration agent files
- Creates missing files if `init` was not run or partially completed

---

## Step 1: Detect Installation

Read these files to determine current state:

```
.atta/.metadata/version           → installed version (USER_VERSION)
.atta/.metadata/framework-version → last applied framework version (FRAMEWORK_VERSION)
.atta/docs/changelog.md           → latest version available (first ## heading = LATEST_VERSION)
```

Report to the user:
- **Installed version**: {USER_VERSION}
- **Target version**: {LATEST_VERSION}

Check for migration markers — any of these indicate migration is needed:

- Old skill names (`/review`, `$review`, `@review` instead of `/atta-review`) in config files or agent files
- Old `.atta/knowledge/` directory still present (dir restructure incomplete)
- Missing `.atta/team/model-registry.json`

If **none** of these markers are found, report: "Installation is already fully migrated. No changes needed." and exit.

Ask the user: **"Which adapter are you using?"** (Claude Code, Copilot, Codex, Gemini, Cursor)

Map the answer to adapter paths:

| Adapter | Agent dir | Config files to scan | Skill prefix |
|---------|-----------|---------------------|--------------|
| Claude Code | `.claude/agents/` | `CLAUDE.md` | `/` |
| Copilot | `.github/atta/agents/` | `AGENTS.md`, `.github/copilot-instructions.md` | `/` |
| Codex | `.agents/agents/` | `AGENTS.md` | `$` |
| Gemini | `.gemini/agents/` | `GEMINI.md` | `/` |
| Cursor | `.cursor/agents/` | `.cursor/rules/*.mdc` | `@` |

---

## Step 2: Backup

Create a backup before any changes:

```bash
timestamp=$(date +%Y%m%d-%H%M%S)
backup_dir=".atta/local/pre-migration-backup-$timestamp"
mkdir -p "$backup_dir"
```

Back up:
1. Any config files that will be modified (CLAUDE.md, AGENTS.md, GEMINI.md, etc.)
2. `.atta/.metadata/version` and `.atta/.metadata/framework-version`
3. `.atta/knowledge/` (if it still exists — will be moved in Step 3)
4. `.atta/.context/` and `.atta/.sessions/` (if they still exist — will be moved in Step 3)
5. `.atta/team/quick-reference.md` (if it has old skill references)

Report: `Backup created at $backup_dir`

---

## Step 3: Directory Restructure (if needed)

> Skip this step if none of the legacy paths exist (`.atta/knowledge/`, `.atta/.context/`, `.atta/.sessions/` are all absent).

If any legacy paths still exist:

| Old Path | New Path | Notes |
|----------|----------|-------|
| `.atta/knowledge/developer-profile.md` | `.atta/local/developer-profile.md` | Personal, gitignored |
| `.atta/knowledge/patterns/` | `.atta/team/patterns/` | User-edited, preserve content |
| `.atta/knowledge/templates/` | `.atta/team/templates/` | Framework content |
| `.atta/knowledge/accs/` | `.atta/team/accs/` | Team shared |
| `.atta/knowledge/quick-reference.md` | `.atta/team/quick-reference.md` | Generated |
| `.atta/knowledge/ci-suppressions.md` | `.atta/team/ci-suppressions.md` | User-edited |
| `.atta/.context/` | `.atta/local/context/` | Runtime, gitignored |
| `.atta/.sessions/` | `.atta/local/sessions/` | Runtime, gitignored |

**Rules:**
- Copy first, then remove originals (only after confirming copy succeeded)
- Never overwrite a file that already exists at the destination
- Show the user the list of moves before applying

---

## Step 4: Skill Reference Rename

This is the primary purpose of this skill. Scan **config files and user-edited content** for old skill names and rename them.

### Rename Map

| Old Reference | New Reference |
|--------------|---------------|
| `/agent` | `/atta-agent` |
| `/collaborate` | `/atta-collaborate` |
| `/librarian` | `/atta-librarian` |
| `/lint` | `/atta-lint` |
| `/migrate` | `/atta-migrate` |
| `/optimize` | `/atta-optimize` |
| `/patterns` | `/atta-patterns` |
| `/preflight` | `/atta-preflight` |
| `/profile` | `/atta-profile` |
| `/review` | `/atta-review` |
| `/security-audit` | `/atta-security-audit` |
| `/ship` | `/atta-ship` |
| `/team-lead` | `/atta-team-lead` |
| `/test` | `/atta-test` |
| `/tutorial` | `/atta-tutorial` |
| `/update` | `/atta-update` |

### Matching Rules

- Match the skill prefix + name with **both** left and right word boundaries:
  - **Left boundary**: preceded by backtick, quote, space, or start of line
  - **Right boundary**: followed by space, backtick, quote, punctuation, end of line, or whitespace
- Do NOT match partial words — e.g., `/reviews`, `/reviewers`, `/review-old` must NOT match `/review`
- Do NOT rename `/atta` itself (the init skill has always been named `/atta`)
- In YAML frontmatter `skills:` arrays, match bare skill names as complete list entries:
  - `- review` → `- atta-review` (the entry is the entire value after `- `)
  - `- collaborate` → `- atta-collaborate`
  - Do NOT match partial entries — `- review-custom` must NOT match

### Adapter-Specific Prefixes

Different tools use different skill invocation prefixes. Apply the rename map using the adapter's prefix (from the table in Step 1):

| Adapter | Old form | New form |
|---------|----------|----------|
| Claude Code | `/review` | `/atta-review` |
| Copilot | `/review` | `/atta-review` |
| Codex | `$review` | `$atta-review` |
| Gemini | `/review` | `/atta-review` |
| Cursor | `@review` | `@atta-review` |

For Codex specifically, scan for both `$skillname` and `/skillname` forms (AGENTS.md may use slash notation in descriptions while `$` is the invocation form).

### Files to Scan

1. **Config files** (adapter-dependent): CLAUDE.md, AGENTS.md, GEMINI.md, `.github/copilot-instructions.md`, `.cursor/rules/*.mdc`
2. **Agent files** in the adapter's agent directory (`.md` files, or `.agent.md` for Copilot — these may contain skill references in routing tables or delegation instructions)
3. **Coordinator/specialist files** (if they exist — generated agents may reference old skill names)
4. **`.atta/team/quick-reference.md`** (if it has skill references)

> Note: Agent files installed by `init` already use the new `atta-*` names. But user-generated coordinators/specialists from `/atta` may still have old references if they were generated before the skill rename.

Show the user a summary: "Found N old skill references in M files" with the full list before applying.

---

## Step 5: Recover User Customizations (if needed)

> This step only applies if the user had customized agent files (Project Rules, librarian additions, personality names) BEFORE running `init`.

`init` installs fresh agent files, which means pre-migration customizations in agent bodies may have been overwritten. Ask the user:

**"Did you have custom content in your agent files (Project Rules, librarian-added directives, personality names) before running init?"**

If **yes**:
1. Check `git diff` or `git stash list` for the pre-init versions of agent files
2. Extract user-added sections from the old versions:
   - `## Project Rules` sections
   - Custom personality names
   - Sections that don't exist in the current template
   - Librarian-added rules or directives
3. Append the preserved content to the end of the current (init-installed) agent files
4. Show the diff to the user before writing

If **no** or **unsure**: Skip this step.

---

## Step 6: Verify Completeness

Check that the installation has all expected components:

| Component | Check | If missing |
|-----------|-------|------------|
| `.atta/team/model-registry.json` | File exists | Suggest re-running `npx atta init` |
| Architect agent | `architect.md` (or adapter equivalent) in agent dir | Suggest re-running `npx atta init` |
| `.atta/team/` directory | Exists with patterns/, templates/ | Run Step 3 if needed |
| `.atta/local/` directory | Exists with developer-profile.md | Run Step 3 if needed |
| Gitignore | Contains `.atta/local/` entry | Add it |

If any components are missing, suggest: `npx atta init --adapter <tool>` to regenerate them.

---

## Step 7: Summary

After applying all changes, show a summary:

```markdown
## Migration Complete ({USER_VERSION} → {LATEST_VERSION})

### Changes Applied
- [ ] Directory restructure: N files moved (or: already done by init)
- [ ] Skill references renamed: N occurrences in M files
- [ ] User customizations recovered: N sections re-applied (or: skipped)
- [ ] Completeness verified: all components present (or: M missing — run init)
- [ ] Backup: .atta/local/pre-migration-backup-{timestamp}/

### Next Steps
1. Review the changes: `git diff`
2. Re-run `/atta` if you want to regenerate specialists for your stack
3. If anything looks wrong: `/atta-migrate --rollback`
```

---

## Rollback (`--rollback`)

When the user runs `/atta-migrate --rollback`:

1. Find the latest `.atta/local/pre-migration-backup-*` directory
2. Show the user what will be restored (list backup contents)
3. After confirmation:
   - Restore config files from backup to their original locations
   - Restore `.atta/.metadata/version` and `framework-version`
   - Restore `.atta/knowledge/`, `.atta/.context/`, `.atta/.sessions/` if they were backed up (reverse of Step 3 dir moves)
   - Restore `.atta/team/quick-reference.md` if it was backed up
4. Report what was restored

---

## Dry Run (`--dry-run`)

When the user runs `/atta-migrate --dry-run`:

Run Steps 1, 3, 4, 6 in read-only mode. For each step, show what WOULD change:
- Files that would be moved (Step 3)
- Skill references that would be renamed, with file:line locations (Step 4)
- Missing components that need attention (Step 6)

End with: "Run `/atta-migrate` (without --dry-run) to apply these changes."

---

## Error Handling

| Error | Recovery |
|-------|----------|
| No `.atta/.metadata/version` found | "No Atta installation detected. Run `npx atta init` first." |
| No migration markers found | "Installation is already fully migrated. No changes needed." |
| Backup dir already exists | Append timestamp to make unique |
| Config file has unexpected format | Skip that file, flag for manual review |
| Git history not available for customization recovery | Ask user to manually identify content to preserve |
