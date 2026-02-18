---
name: migrate
description: Compatibility alias for migration operations. Routes to /update Migration mode.
---

You are running **migrate** as a compatibility alias.

`/update` is the single public command for all version transitions.

## How to Use

```bash
/migrate --from ./.claude_staging/.claude
/migrate --dry-run --from ./.claude_staging/.claude
/migrate --interactive --from ./.claude_staging/.claude
/migrate --add-update-system --from ./.claude_staging/.claude
/migrate --rollback
/migrate --history
```

## Source Acquisition (for transition operations)

```bash
git clone --depth 1 <framework-repo-url> .claude_staging
```

This should provide `./.claude_staging/.claude` as the incoming source path.

## Alias Routing Rules

For all migration-related operations, route to `/update` and report the forwarded command.

| Input | Forward to |
|-------|------------|
| `/migrate --from <path>` | `/update pull --from <path> --mode migration` |
| `/migrate --dry-run --from <path>` | `/update pull --dry-run --from <path> --mode migration` |
| `/migrate --interactive --from <path>` | `/update pull --interactive --from <path> --mode migration` |
| `/migrate --add-update-system --from <path>` | `/update pull --from <path> --mode migration-bootstrap` |
| `/migrate --rollback` | `/update rollback` |
| `/migrate --history` | `/update --history` |

## Required Behavior

1. Validate required flags before forwarding.
2. For migration/apply flows, require `--from <path>`.
3. Confirm source path has `.metadata/version`.
4. Print selected mode (`migration` or `migration-bootstrap`) before execution.
5. Reuse `/update` backup, merge, and rollback behavior.

## User-Facing Message Template

```markdown
## `/migrate` Compatibility Alias

This command is forwarded to `/update`.

- Requested: [original migrate command]
- Forwarded: [equivalent update command]
- Mode: Migration

Continuing with `/update` execution...
```

## Error Handling

### Missing `--from`

```markdown
⚠️ Missing source path

Use:
- `/migrate --from ./.claude_staging/.claude`
- `/migrate --dry-run --from ./.claude_staging/.claude`
```

### Invalid Source Path

```markdown
⚠️ Invalid source path

Expected file not found:
`<path>/.metadata/version`

Ensure `.claude_staging/.claude` exists and try again.
```

## Notes

- Keep this alias for backward compatibility.
- Prefer documenting `/update` in primary docs.
- This alias can be deprecated after users transition.

_Compatibility Alias v2.3 — `/migrate` forwards to `/update` Migration mode_
