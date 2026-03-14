---
name: atta-migrate
description: Compatibility alias for migration operations. Routes to /atta-update Migration mode.
disable-model-invocation: true
model: haiku
argument-hint: "[--from path] [--dry-run] [--interactive]"
---

You are running **migrate** as a compatibility alias.

`/atta-update` is the single public command for all version transitions.

## How to Use

```bash
/atta-migrate --from ./.claude_staging/.claude
/atta-migrate --dry-run --from ./.claude_staging/.claude
/atta-migrate --interactive --from ./.claude_staging/.claude
/atta-migrate --add-update-system --from ./.claude_staging/.claude
/atta-migrate --rollback
/atta-migrate --history
```

## Source Acquisition (for transition operations)

```bash
git clone --depth 1 https://github.com/codelaude/atta.git .claude_staging
```

This should provide `./.claude_staging/.claude` as the incoming source path.

## Alias Routing Rules

For all migration-related operations, route to `/atta-update` and report the forwarded command.

| Input | Forward to |
|-------|------------|
| `/atta-migrate` (no flags) | Error: missing required `--from <path>` for migration/apply flows |
| `/atta-migrate --from <path>` | `/atta-update pull --from <path> --mode migration` |
| `/atta-migrate --dry-run --from <path>` | `/atta-update pull --dry-run --from <path> --mode migration` |
| `/atta-migrate --interactive --from <path>` | `/atta-update pull --interactive --from <path> --mode migration` |
| `/atta-migrate --add-update-system --from <path>` | `/atta-update pull --from <path> --mode migration-bootstrap` |
| `/atta-migrate --rollback` | `/atta-update rollback` |
| `/atta-migrate --history` | `/atta-update --history` |

## Required Behavior

1. Validate required flags before forwarding.
2. For migration/apply flows, require `--from <path>`.
3. Confirm source path has `.metadata/version`.
4. Print selected mode (`migration` or `migration-bootstrap`) before execution.
5. Reuse `/atta-update` backup, merge, and rollback behavior.

## User-Facing Message Template

```markdown
## `/atta-migrate` Compatibility Alias

This command is forwarded to `/atta-update`.

- Requested: [original migrate command]
- Forwarded: [equivalent update command]
- Mode: [migration|migration-bootstrap]

Continuing with `/atta-update` execution...
```

## Error Handling

| Error | Recovery |
|-------|----------|
| Missing `--from` | Show correct usage with `--from ./.claude_staging/.claude` |
| Invalid source path | Check `<path>/.metadata/version` exists |

_Compatibility alias — `/atta-migrate` forwards to `/atta-update` Migration mode_
