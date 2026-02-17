# Session Tracking - Skill Integration Template

This template shows how to add session tracking to any skill.

## Template Structure

```markdown
---
name: your-skill-name
description: Your skill description
---

# Your Skill Name

<!-- START: Session Tracking Setup -->
## 🔍 Session Tracking

Before proceeding with the skill logic, initialize session tracking:

**Step 1: Create session file**

Use the current timestamp for the filename and generate a session ID.

File: `{claudeDir}/.sessions/session-{YYYY-MM-DD-HHMMSS}.json`

Content:
```json
{
  "schemaVersion": "1.0.0",
  "sessionId": "{generate-uuid-v4}",
  "timestamp": "{output of: date -u +%Y-%m-%dT%H:%M:%SZ}",
  "startedBy": "user",
  "skill": {
    "name": "{skill-name}",
    "args": "{actual args passed by user, or empty string}",
    "status": "in_progress"
  },
  "agents": [],
  "metadata": {
    "projectPath": "{current-working-directory}",
    "claudeDir": "{claudeDir-from-settings}",
    "tokensUsed": null,
    "costUSD": null
  }
}
```

**Record the session filename in a variable for later updates.**

<!-- END: Session Tracking Setup -->

---

## Your Skill Logic

<!-- Your existing skill instructions go here -->

### Example: If invoking an agent

When you invoke an agent (e.g., using Task tool or /agent skill), update the session file:

```markdown
Update session file to track agent invocation:

Edit `{claudeDir}/.sessions/session-{timestamp}.json`:
- Add to "agents" array:
  ```json
  {
    "name": "{agent-name}",
    "role": "{universal|coordinator|specialist}",
    "invokedAt": "{output of: date -u +%Y-%m-%dT%H:%M:%SZ}",
    "status": "in_progress"
  }
  ```

After agent completes, update its status:
- Change "status": "in_progress" → "completed" (or "failed" if it failed)
```

---

<!-- START: Session Tracking Finalization -->
## ✅ Finalize Session

At the end of skill execution (success or failure):

**Step 1: Update session status**

Edit `{claudeDir}/.sessions/session-{timestamp}.json`:
- Change `"status": "in_progress"` to `"completed"` (or "failed"/"interrupted")
- Update `"duration"` to elapsed milliseconds

**Step 2: Run cleanup**

Execute cleanup script to maintain 10-session limit:
```bash
.claude/scripts/session-cleanup.sh
```

<!-- END: Session Tracking Finalization -->

```

## Integration Steps

### 1. At Skill Start

Run all four commands together:
```bash
date +%Y-%m-%d-%H%M%S          # filename timestamp
uuidgen | tr '[:upper:]' '[:lower:]'  # session UUID
date -u +%Y-%m-%dT%H:%M:%SZ    # ISO-8601 UTC for "timestamp" JSON field
date +%s                        # Unix start time for duration calculation
```

- Set `skill.args` to the actual arguments passed by the user (e.g. `"--flag value"`), or `""` if none — never hardcode
- Create session JSON file with `"status": "in_progress"`
- Store the filename and Unix start time for use at finalization

### 2. During Execution
- When invoking agents: Add entry to "agents" array
- When agent completes: Update agent status
- Track any important metadata

### 3. At Skill End
- Calculate duration (end time - start time in ms)
- Update skill status to "completed"/"failed"/"interrupted"
- Run cleanup script

## Error Handling

If the skill fails or is interrupted:
1. Still update the session file with final status
2. Set `"status": "failed"` or `"interrupted"`
3. Still run cleanup script

Example:
```markdown
If an error occurs during execution:
- Update session status to "failed"
- Set duration to elapsed time
- Run cleanup script
- Then report the error to user
```

## Testing Your Integration

After integrating session tracking:

1. Run your skill
2. Check `{claudeDir}/.sessions/` for the new session file
3. Verify the JSON structure matches the schema
4. Run the skill 11+ times
5. Verify cleanup keeps only 10 most recent sessions

## Real Example: /init Integration

See `.claude/skills/init/SKILL.md` for a complete working example of session tracking integration.

Key points from `/init`:
- Session created at start with "in_progress"
- Agents tracked as they're invoked (project-owner, specialists)
- Duration calculated at end
- Status updated to "completed"
- Cleanup runs automatically

---

## Quick Reference

**Session file path**: `{claudeDir}/.sessions/session-{timestamp}.json`

**Cleanup command**: `.claude/scripts/session-cleanup.sh`

**Schema**: See `.claude/.sessions/schema.json`

**Full guide**: See `.claude/.sessions/TRACKING_GUIDE.md`
