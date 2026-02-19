# Session Tracking Integration Guide

## For Skill Developers

This guide explains how to integrate session tracking into skills.

## Important: File Paths

**Session files are generated in your working directory**:
- Framework files (this guide, schema, scripts) live in `.claude/`
- Generated session files live in `{claudeDir}/.sessions/` where `{claudeDir}` comes from settings
- By default, `{claudeDir}` is `.claude/` (can be customized in settings.json)

**Always use `{claudeDir}` from settings**, not a hardcoded path

## Quick Start

At the **start** of your skill execution, create a session file:

```markdown
## Session Tracking (Start)

First, get the claudeDir from settings (usually from .claude/settings.json or settings.local.json).

<tool:Write>
  file_path: {claudeDir}/.sessions/session-{timestamp}.json
  content: {
    "schemaVersion": "1.0.0",
    "sessionId": "{uuid}",
    "timestamp": "{ISO-8601-timestamp}",
    "startedBy": "user",
    "skill": {
      "name": "{skill-name}",
      "args": "{arguments}",
      "status": "in_progress"
    },
    "agents": [],
    "metadata": {
      "projectPath": "{cwd}",
      "claudeDir": "{claudeDir}",
      "duration": null,
      "tokensUsed": null,
      "costUSD": null
    }
  }
</tool:Write>
```

At the **end** of your skill execution, update the session file:

```markdown
## Session Tracking (End)

<tool:Edit>
  file_path: {claudeDir}/.sessions/session-{timestamp}.json
  Find: "status": "in_progress"
  Replace: "status": "completed"

  Also update: "duration": {elapsed-ms}
</tool:Edit>
```

## Tracking Agent Invocations

When you invoke an agent (using `/agent` or `Task` tool), add to the agents array:

```json
{
  "name": "typescript",
  "role": "specialist",
  "invokedAt": "2026-02-16T14:35:00.000Z",
  "status": "completed"
}
```

## File Naming Convention

Session files follow this pattern:
```
session-YYYY-MM-DD-HHMMSS.json
```

Examples:
- `session-2026-02-16-143000.json` (Feb 16, 2026 at 2:30pm)
- `session-2026-02-16-154530.json` (Feb 16, 2026 at 3:45:30pm)

## Generating UUIDs

For `sessionId`, use this format:
```javascript
// Pattern: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
// Example: f47ac10b-58cc-4372-a567-0e02b2c3d479
```

You can generate UUIDs using:
```bash
uuidgen | tr '[:upper:]' '[:lower:]'
```

Or use a pseudo-random pattern in the session filename itself as the ID.

## Cleanup Logic

**Automatic cleanup** (integrated into session tracking):

The cleanup script automatically detects the correct directory from settings:
```bash
.claude/scripts/session-cleanup.sh
```

Or explicitly specify the Claude directory:
```bash
.claude/scripts/session-cleanup.sh {claudeDir}
```

The script will:
1. Auto-detect `{claudeDir}` from settings.json or settings.local.json
2. Check session count in `{claudeDir}/.sessions/`
3. Keep only the 10 most recent sessions
4. Delete older sessions automatically

## Example Integration

See how `init` skill integrates tracking:

```markdown
# Init Skill with Session Tracking

## Step 1: Start Session Tracking
<Write session file with "in_progress">

## Step 2: Execute Init Logic
<Your existing skill logic here>

## Step 3: Track Agent Usage
When invoking project-owner:
<Edit session file to add agent entry>

## Step 4: Finalize Session
<Edit session file to mark "completed", add duration>

## Step 5: Cleanup Old Sessions
<Remove sessions beyond 10 most recent>

## Step 6: Update Recent Work Context
<Run generate-context.sh to refresh .context/recent.md>
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

## Context Generation

After finalizing sessions and running cleanup, regenerate the recent work context:

```bash
.claude/scripts/generate-context.sh
```

Or with an explicit Claude directory:
```bash
.claude/scripts/generate-context.sh {claudeDir}
```

This produces `{claudeDir}/.context/recent.md` — a bullet-point summary of the last 5 sessions. Agents (especially Project Owner) read this file to understand recent project activity.

See `{claudeDir}/.context/README.md` for format details.

## Best Practices

1. **Always start tracking** at the beginning of skill execution
2. **Update agent invocations** in real-time as they happen
3. **Finalize at the end** even if the skill fails
4. **Run cleanup** after finalizing to maintain 10-session limit
5. **Generate context** after cleanup to keep agents informed
6. **Use descriptive args** to help future analytics
7. **Keep it lightweight** - no conversation logs, just metadata

## Future Extensions (v2.5+)

These fields are reserved for future use:
- `tokensUsed`: Will be populated by API response tracking
- `costUSD`: Will be calculated from token usage
- `metadata.learnings`: Patterns detected during session
- `metadata.corrections`: User corrections made

Leave these as `null` for now.
