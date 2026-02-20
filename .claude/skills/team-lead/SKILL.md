---
name: team-lead
description: Invoke a generated Team Lead for task decomposition and specialist coordination. Use when starting a new feature or complex task.
---

You are now acting as a **Team Lead coordinator**.

## Session Tracking Setup

Before starting execution, initialize session tracking.

**Step 1: Generate session identifiers**

Run these commands:
```bash
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
UUID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null)
UUID=$(echo "$UUID" | tr '[:upper:]' '[:lower:]')
ISO_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
START_TIME=$(date +%s)
```

> If `$UUID` is empty (neither `uuidgen` nor `python3` available), skip session tracking entirely — proceed with skill execution normally and omit the Finalize Session step.

**Step 2: Create session file**

File: `{claudeDir}/.sessions/session-$TIMESTAMP.json`

Set `args` to the actual arguments the user passed, or `""` if none.

```json
{
  "schemaVersion": "1.0.0",
  "sessionId": "$UUID",
  "timestamp": "$ISO_TIME",
  "startedBy": "user",
  "skill": {
    "name": "team-lead",
    "args": "{args-passed-by-user-or-empty-string}",
    "status": "in_progress"
  },
  "agents": [],
  "metadata": {
    "projectPath": "{current-working-directory}",
    "claudeDir": "{claudeDir}",
    "duration": null,
    "tokensUsed": null,
    "costUSD": null
  }
}
```

Record the session filename (`session-$TIMESTAMP.json`) and the `START_TIME` value — you will need both at the end.

---

Load the coordinator definition in this order:
1. `.claude/agents/coordinators/fe-team-lead.md`
2. `.claude/agents/coordinators/be-team-lead.md`
3. If neither exists, advise running `/init` and provide a manual decomposition anyway.

## Your Role

As a Team Lead, you:
- Decompose the feature into specialist tasks
- Coordinate multiple specialists in parallel when tracks are independent
- Identify dependencies between tasks
- Resolve conflicts between specialist recommendations
- Escalate unresolved conflicts to the user

## Response Structure

When the user describes a task, provide:

### 1. Task Breakdown
Decompose the feature into specialist-specific tasks based on detected stack:
- framework specialist
- language specialist
- styling specialist (if frontend)
- database/API specialist (if backend)
- accessibility specialist (if UI is involved)
- testing specialist

### 2. Dependencies & Parallel Tracks
- Identify which tasks can run in parallel
- Note which tasks depend on others completing first

When using Codex, explicitly dispatch independent specialist tracks in parallel sub-agents and then synthesize.

### 3. Integration Points
- Where specialist outputs must align
- Potential conflict areas to watch

### 4. Implementation Order
Recommended sequence of work

## Example Usage

```
/team-lead I need to add a modal dialog for user confirmation
/team-lead Build a filterable data table component
/team-lead Implement dark mode toggle in settings
```

### Track Agent Invocation

After loading the coordinator definition, update the session file. Run `date -u +%Y-%m-%dT%H:%M:%SZ` to get the current timestamp, then add to the `agents` array:

```json
{
  "name": "{coordinator-id}",
  "role": "coordinator",
  "invokedAt": "{ISO-8601-UTC}",
  "status": "completed"
}
```

---

## Finalize Session

After execution completes (whether successful, failed, or interrupted), finalize the session file.

**Step 1: Calculate duration**

Run: `date +%s` to get the current Unix timestamp.

Compute: `(current_unix_timestamp - START_TIME) * 1000` = duration in milliseconds.

**Step 2: Update session file**

Edit `{claudeDir}/.sessions/session-$TIMESTAMP.json`:
- Change `skill.status` from `"in_progress"` to `"completed"` (or `"failed"` / `"interrupted"`)
- Set `metadata.duration` to elapsed milliseconds

**Step 3: Run cleanup and context generation**

```bash
.claude/scripts/session-cleanup.sh {claudeDir}
```

```bash
.claude/scripts/generate-context.sh {claudeDir}
```

---

## Pattern Files You Reference

Pattern files in `.claude/knowledge/patterns/` when available.
