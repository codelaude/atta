# Session Tracking Integration - How It Works

This document explains how session tracking works in the current hook-based architecture (since v2.5.3).

## How Session Tracking Works

Since v2.5.3, session tracking is **fully automatic** — handled by Claude Code hooks. Skills have zero tracking code.

### The Flow

1. **You run a skill** (e.g., `/atta-agent code-reviewer "Review this component"`)
2. **`PostToolUse` hook fires** — creates a session JSON file in `{claudeDir}/.sessions/`
3. **Skill executes normally** — no tracking overhead
4. **`Stop` hook fires on exit** — finalizes the session (status, duration, cleanup)

### What Gets Recorded

```json
{
  "schemaVersion": "1.0.0",
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "timestamp": "2026-02-16T22:35:00.000Z",
  "startedBy": "user",
  "skill": {
    "name": "atta-agent",
    "args": "code-reviewer \"Review this component\"",
    "status": "completed"
  },
  "agents": [
    {
      "name": "code-reviewer",
      "role": "universal",
      "invokedAt": "2026-02-16T22:35:02.000Z",
      "status": "completed"
    }
  ],
  "metadata": {
    "projectPath": "/path/to/your/project",
    "claudeDir": ".claude",
    "duration": 8500,
    "tokensUsed": null,
    "costUSD": null
  }
}
```

### Automatic Cleanup

The `Stop` hook runs `.atta/scripts/session-cleanup.sh` which keeps only the last 10 sessions. No manual intervention needed.

---

## For Custom Skills

If you're writing a custom skill, **you don't need to add any session tracking code**. The hooks handle everything automatically.

Your skill template should look like:

```markdown
---
name: atta-your-skill
description: Your skill description
---

## Step 1: ...
## Step 2: ...
```

That's it. The hook sees the `Skill` tool invocation and creates/finalizes the session.

---

## Verifying Session Tracking

```bash
# Run a skill
/atta-agent code-reviewer "Review component"

# Check session was created
ls -lh {claudeDir}/.sessions/session-*.json

# Verify content
cat {claudeDir}/.sessions/session-*.json | python3 -m json.tool

# Verify cleanup keeps only 10
ls {claudeDir}/.sessions/session-*.json | wc -l  # Should output: ≤ 10
```

---

## Benefits

1. **Analytics**: See which agents are used most frequently
2. **Performance**: Identify slow-running skills
3. **Debugging**: Track what happened in failed sessions
4. **Pattern detection**: Foundation for correction logging and agent learning (shipped in v2.5)

## Platform Support

Session tracking is **Claude Code only** — it requires the `PostToolUse` and `Stop` hook events. Other tools (Copilot, Codex, Gemini, Cursor) skip tracking entirely. Skills still work — only the tracking side-effects are skipped.
