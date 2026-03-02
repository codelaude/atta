# Session Tracking Integration Guide

## Overview

Session tracking records skill invocations as JSON files in `{claudeDir}/.sessions/`. Since v2.5.3, tracking is handled automatically by **Claude Code hooks** — no in-skill boilerplate needed.

## How It Works

### Claude Code (Hooks — Automatic)

The hook script `.claude/hooks/session-track.sh` handles everything:

1. **PostToolUse on Skill** → creates `session-{timestamp}-{uuid}.json` with skill name, args, status `"in_progress"`
2. **Stop** → finds latest in-progress session, sets status `"completed"`, calculates duration, runs cleanup + context generation

Hook configuration is generated in `.claude/settings.local.json` by the Claude Code adapter during `npx atta-dev init`.

### Other Tools (No hooks — No session tracking)

Copilot, Codex, and Gemini adapters do not support hooks. Session tracking is skipped for these tools.

## File Paths

- **Session files**: `{claudeDir}/.sessions/session-YYYY-MM-DD-HHMMSS-{uuid}.json`
- **Hook script**: `.claude/hooks/session-track.sh` (framework source)
- **Schema**: `.atta/.sessions/schema.json`
- `{claudeDir}` comes from `.env.claude` (CLAUDE_WORKSPACE_DIR) or defaults to `.claude/`

## Session Schema

```json
{
  "schemaVersion": "1.0.0",
  "sessionId": "uuid-v4",
  "timestamp": "ISO-8601-UTC",
  "startedBy": "user",
  "skill": {
    "name": "review",
    "args": "src/components/",
    "status": "in_progress | completed | failed | interrupted"
  },
  "agents": [],
  "metadata": {
    "projectPath": "/path/to/project",
    "claudeDir": "/path/to/project/.claude",
    "duration": null,
    "tokensUsed": null,
    "costUSD": null
  }
}
```

## Cleanup

The hook auto-runs `session-cleanup.sh` (keeps 10 most recent sessions) and `generate-context.sh` (refreshes `{claudeDir}/.context/recent.md`) on session finalization.

## Manual Session Tracking (if hooks unavailable)

If you need to create sessions without hooks:

```bash
# Create
bash .claude/hooks/session-track.sh <<< '{"hook_event_name":"PostToolUse","tool_name":"Skill","tool_input":{"skill":"review","args":"src/"},"cwd":"/path/to/project"}'

# Finalize
bash .claude/hooks/session-track.sh <<< '{"hook_event_name":"Stop","cwd":"/path/to/project"}'
```

## Status Values

### Skill Status
- `in_progress`: Skill is currently running
- `completed`: Skill finished successfully
- `failed`: Skill encountered an error
- `interrupted`: User canceled or session ended unexpectedly

### Agent Status
- `completed`: Agent finished its task
- `failed`: Agent encountered an error
