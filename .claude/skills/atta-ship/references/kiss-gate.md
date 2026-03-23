# KISS Gate — Simplicity Review (Step 2.5)

## Base Branch Resolution

Detect base branch dynamically (similar to `/atta-review`, with additional local-branch fallback):

```bash
# Try remote branches first, then local branches, then fallback
if git rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
  BASE=origin/main
elif git rev-parse --verify --quiet origin/master >/dev/null 2>&1; then
  BASE=origin/master
elif git rev-parse --verify --quiet origin/develop >/dev/null 2>&1; then
  BASE=origin/develop
elif git rev-parse --verify --quiet main >/dev/null 2>&1; then
  BASE=main
elif git rev-parse --verify --quiet master >/dev/null 2>&1; then
  BASE=master
elif git rev-parse --verify --quiet develop >/dev/null 2>&1; then
  BASE=develop
else
  # No remote or local base — fall back to working-tree heuristics
  BASE=""
fi
```

**If `$BASE` is empty** (no remote base), use this complete fallback for all derived values:
- `files_changed`: count of `git diff HEAD --name-only 2>/dev/null` plus `git ls-files --others --exclude-standard` (staged + unstaged + untracked; if HEAD doesn't exist, use `git status --porcelain | wc -l`)
- `commit_count`: treat as `1` (uncommitted work = single logical change)
- `file_commit_ratio`: `files_changed / 1`
- `new_files`: `git diff HEAD --diff-filter=A --name-only 2>/dev/null` plus `git ls-files --others --exclude-standard` (staged new files + untracked files)
- Skip any command that uses `$BASE...HEAD` range syntax

## Task Type Inference

Infer task type from branch name and commit messages to select the correct threshold row:

| Branch pattern | Task type |
|---------------|-----------|
| `config/*`, `chore/*`, `env/*` | Config change |
| `fix/*`, `bugfix/*`, `hotfix/*` | Bug fix |
| `refactor/*`, `cleanup/*` | Refactor |
| `docs/*`, `documentation/*` | Documentation |
| `feature/*`, `feat/*` (default) | Feature (small if ≤30 files, medium if >30) |

Apply the matching row from the **Task-Type Thresholds** table in `.atta/team/kiss-thresholds.md`. If the matched row shows `(global defaults)` for its thresholds (e.g., Refactor), use global defaults from the frontmatter (`max_files`, `file_commit_ratio`). If no task type matched at all, use Feature (small) defaults.

## Threshold Extraction

Read `.atta/team/kiss-thresholds.md` and extract these values from the frontmatter `thresholds:` block:

```yaml
# Expected frontmatter format:
thresholds:
  max_files: 50
  file_commit_ratio: 10
  flags_to_block: 3
  strict: false
```

If no frontmatter `thresholds:` block exists, fall back to parsing the Scope Limits table. If neither is present, use hardcoded defaults: `max_files: 50`, `file_commit_ratio: 10`, `flags_to_block: 3`, `strict: false`.

For task-type specific limits, read the Task-Type Thresholds table rows. Match the inferred task type to the first column. Use the row's Files (Flag) and Files (Block) values instead of the global `max_files`.

## Changeset Analysis

**When `$BASE` is resolved** (normal path):

```bash
git diff --stat $BASE...HEAD       # File count and change sizes
git log --oneline $BASE...HEAD     # Commit count and messages
```

Extract:
- `files_changed`: total files in diff
- `commit_count`: number of commits (if 0, treat as 1)
- `file_commit_ratio`: `files_changed / commit_count`
- `new_files`: files added (`git diff --diff-filter=A --name-only $BASE...HEAD`)

**When `$BASE` is empty** (no-remote fallback): use the alternate values defined in the Base Branch Resolution section above. Do not use `$BASE...HEAD` range syntax.

## Signal Evaluation

### Signal 1: Scope
Compare `files_changed` against the task-type threshold (or global `max_files` if no task type matched).
- **BLOCK** if files > Block threshold AND `file_commit_ratio` > configured ratio
- **FLAG** if files > Flag threshold but below Block
- **PASS** otherwise

### Signal 2: New Infrastructure
Check `new_files` for paths listed in the "Always Flag" section of `kiss-thresholds.md`.
- **FLAG** if any new file matches an always-flag path
- **BLOCK** if `strict: true`
- **PASS** otherwise

### Signal 3: Reinvention
Search existing codebase for function/class names similar to those introduced in the changeset.
- **FLAG** if a new function duplicates an existing one in name or purpose
- **PASS** otherwise

### Signal 4: Abstractions
Detect new interfaces, abstract classes, factories, or wrappers in the changeset.
- **FLAG** if any new abstraction has only one implementation or consumer
- **PASS** otherwise

### Signal 5: Consistency
Compare the changeset's approach against patterns in `.atta/team/patterns/` and recent git history.
- **FLAG** if the changeset introduces a new pattern where an established one exists
- **PASS** otherwise

## Block Decision

1. If any signal is BLOCK → **BLOCKED**
2. Count total FLAGs. If >= `flags_to_block` (default 3) → **BLOCKED**
3. If any FLAGs but below threshold → **FLAGGED** (warnings added to PR Notes)
4. Otherwise → **PASS**

## Always-Flag Paths (Defaults)

These paths always trigger a FLAG when new files are added, regardless of whether the project already uses them. The "Always Flag" section in `kiss-thresholds.md` can extend this list, but these are the built-in defaults:

```
.github/workflows/
.gitlab-ci.yml
.circleci/
Jenkinsfile
Dockerfile*
docker-compose*
k8s/
kubernetes/
charts/
```

> These are hardcoded defaults in the gate logic, not dependent on `/atta` detection. The mappings file adds project-specific entries on top.
