---
type: kiss_thresholds
priority: high
thresholds:
  max_files: 50
  file_commit_ratio: 10
  flags_to_block: 3
  strict: false
---

# KISS Thresholds

> Team-configurable thresholds for the Simplicity Review (KISS gate) in `/atta-ship`.
> Sections marked `<!-- auto-populated -->` are filled by `/atta` during init based on detected stack.
> Adjust any values to match your team's conventions.

---

## Scope Limits

<!-- auto-populated: monorepo detection adjusts these defaults -->

| Parameter | Default | Description |
|-----------|---------|-------------|
| `max_files` | 50 | Maximum files changed before scope is flagged |
| `file_commit_ratio` | 10 | Files-per-commit ratio that triggers a scope flag |
| `flags_to_block` | 3 | Number of accumulated FLAGs that escalate to a BLOCK |

## Task-Type Thresholds

Thresholds vary by task type, inferred from branch name or commit messages.

| Task Type | Files (Flag) | Files (Block) |
|-----------|:---:|:---:|
| Config change | >5 | >10 |
| Bug fix | >8 | >15 |
| Feature (small) | >15 | >25 |
| Feature (medium) | >30 | >50 |
| Refactor | (global defaults) | (global defaults) |
| Documentation | >15 | >30 |

> New infrastructure is always flagged via the Always Flag paths section below, regardless of task type.
> Dependency manifest scanning is planned for a future version.

## Strict Mode

When `strict: true` (set in frontmatter above), any individual FLAG becomes a BLOCK. Useful for teams with chronic over-engineering issues. Edit the `thresholds.strict` value in the frontmatter at the top of this file to change.

## Exempt Patterns

Files matching these patterns are excluded from scope counts.

<!-- auto-populated: /atta adds entries based on detected stack -->

```
# Always exempt
*.lock
*.lockb
pnpm-lock.yaml
package-lock.json
yarn.lock
*.snap
*.generated.*

# Migrations — uncommented automatically if migration tools detected
# migrations/
# db/migrate/
# db/migration/
# prisma/migrations/

# Add your project-specific exemptions below:
```

## Always Flag

New files in these paths always trigger a FLAG, regardless of task type. These are on by default — adding infrastructure to any project deserves scrutiny.

```
# CI/CD
.github/workflows/
.gitlab-ci.yml
.circleci/
Jenkinsfile

# Containers
Dockerfile*
docker-compose*
k8s/
kubernetes/
charts/

# Add your project-specific always-flag paths below:
```

---

## Customization

1. Run `/atta` — auto-populates exempt patterns and flag paths from your detected stack
2. Edit this file to adjust thresholds for your team
3. Commit to the repo — entire team gets the same standards
4. For one-off large PRs, developers use `--skip-kiss` (adds note to PR description)
5. Run `/atta --rescan` to refresh auto-populated sections without losing manual edits
