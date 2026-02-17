# Session Tracking Integration - Complete Example

This document shows a before/after comparison of integrating session tracking into a skill.

## Before: Simple Agent Skill (No Tracking)

```markdown
---
name: agent
description: Invoke a specialized agent by ID
---

# Agent Invocation Skill

Usage:
```
/agent vue "Review this component for accessibility issues"
/agent testing-specialist "Suggest test cases for the login flow"
```

## Step 1: Parse Arguments

Extract agent name and task from arguments.

## Step 2: Locate Agent File

Find the agent in `.claude/agents/{agent-name}.md`

## Step 3: Invoke Agent

Use Task tool to invoke the agent with the user's task.

## Step 4: Report Results

Show the agent's response to the user.
```

---

## After: With Session Tracking

```markdown
---
name: agent
description: Invoke a specialized agent by ID
---

# Agent Invocation Skill

Usage:
```
/agent vue "Review this component for accessibility issues"
/agent testing-specialist "Suggest test cases for the login flow"
```

---

## 🔍 Session Tracking - Start

**Create session file:**

First, get the claudeDir from settings (usually ".claude", or a custom value from settings.json).

Generate timestamp and UUID:
```bash
TIMESTAMP=$(date -u +%Y-%m-%d-%H%M%S)
UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
```

Write session file `{claudeDir}/.sessions/session-$TIMESTAMP.json`:

```json
{
  "schemaVersion": "1.0.0",
  "sessionId": "$UUID",
  "timestamp": "2026-02-16T22:35:00.000Z",
  "startedBy": "user",
  "skill": {
    "name": "agent",
    "args": "vue \"Review this component\"",
    "status": "in_progress"
  },
  "agents": [],
  "metadata": {
    "projectPath": "/path/to/your/project",
    "claudeDir": ".claude",
    "duration": null,
    "tokensUsed": null,
    "costUSD": null
  }
}
```

**Store session filename for later:** `SESSION_FILE=session-$TIMESTAMP.json`

---

## Step 1: Parse Arguments

Extract agent name and task from arguments.

Example: `vue "Review this component"`
- Agent: `vue`
- Task: `Review this component`

---

## Step 2: Locate Agent File

Find the agent in `.claude/agents/specialists/{agent-name}.md` (or `.claude/agents/{agent-name}.md` for core agents)

Path: `.claude/agents/specialists/vue.md`

---

## Step 3: Invoke Agent

**Before invoking, update session to track agent:**

Edit `{claudeDir}/.sessions/$SESSION_FILE`:

Add to "agents" array:
```json
{
  "name": "vue",
  "role": "specialist",
  "invokedAt": "2026-02-16T22:35:02.000Z",
  "status": "in_progress"
}
```

**Now invoke the agent:**

Use Task tool to invoke the agent with the user's task.

**After agent completes, update its status:**

Edit `{claudeDir}/.sessions/$SESSION_FILE`:

Find the vue entry in "agents" array and update:
```json
{
  "name": "vue",
  "role": "specialist",
  "invokedAt": "2026-02-16T22:35:02.000Z",
  "status": "completed"  // Changed from "in_progress"
}
```

---

## Step 4: Report Results

Show the agent's response to the user.

---

## ✅ Session Tracking - Finalize

**Calculate duration:**
```bash
END_TIME=$(date +%s)
DURATION=$(( (END_TIME - START_TIME) * 1000 ))  # Convert to milliseconds
```

**Update session status:**

Edit `{claudeDir}/.sessions/$SESSION_FILE`:

Changes:
1. `"status": "in_progress"` → `"status": "completed"`
2. `"duration": null` → `"duration": $DURATION`

Final session file:
```json
{
  "schemaVersion": "1.0.0",
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "timestamp": "2026-02-16T22:35:00.000Z",
  "startedBy": "user",
  "skill": {
    "name": "agent",
    "args": "vue \"Review this component\"",
    "status": "completed"
  },
  "agents": [
    {
      "name": "vue",
      "role": "specialist",
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

**Run cleanup:**
```bash
.claude/scripts/session-cleanup.sh
```

---

```

## Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| **Setup** | None | Create session file at start |
| **Agent tracking** | Not tracked | Add agent to session before/after invoke |
| **Finalization** | None | Update status, duration, run cleanup |
| **Data captured** | None | Timestamp, skill name, agents used, duration |

## Benefits of Tracking

1. **Analytics**: See which agents are used most frequently
2. **Performance**: Identify slow-running skills
3. **Debugging**: Track what happened in failed sessions
4. **Learning**: Foundation for pattern detection (v2.5)
5. **Cost tracking**: Placeholder for future token/cost monitoring (v3.5)

## Testing the Integration

Run the skill and verify:

```bash
# Run the skill
/agent vue "Review component"

# Check session was created
ls -lh {claudeDir}/.sessions/session-*.json

# Verify content
cat {claudeDir}/.sessions/session-2026-02-16-223500.json

# Run it 11 more times and verify cleanup keeps only 10
for i in {1..11}; do
  /agent testing-specialist "Task $i"
  sleep 1
done

# Should only have 10 sessions
ls {claudeDir}/.sessions/session-*.json | wc -l  # Should output: 10
```

## Common Pitfalls

1. **Forgetting to finalize**: Always update session status, even if skill fails
2. **Not running cleanup**: Sessions will accumulate indefinitely
3. **Wrong timestamp format**: Use ISO 8601 format consistently
4. **Missing agent status updates**: Update both when starting and completing
5. **Hardcoded paths**: Use relative paths from project root

## Next Steps

After integrating session tracking:

1. ✅ Test the integration thoroughly
2. ✅ Update skill documentation to mention tracking
3. ✅ Monitor `{claudeDir}/.sessions/` to verify cleanup works
4. 🔜 In v2.5: Use session data for pattern detection
5. 🔜 In v3.5: Add token/cost tracking to sessions
