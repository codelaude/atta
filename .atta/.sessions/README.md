# Session Tracking System

## Overview
Tracks skill invocations and agent usage across sessions to enable future features like analytics, cost tracking, and pattern detection.

## Structure

### Framework Files (`.atta/.sessions/`)
The framework source files are stored in `.atta/.sessions/`:
```
.atta/.sessions/
├── README.md                    # This file (framework documentation)
├── schema.json                  # JSON Schema definition (framework)
├── TRACKING_GUIDE.md            # Developer integration guide (framework)
├── SKILL_TEMPLATE.md            # Skill integration template (framework)
└── INTEGRATION_EXAMPLE.md       # Example integration (framework)
```

### Generated Session Files (`{claudeDir}/.sessions/`)
Session files are generated at runtime in your working directory:
```
{claudeDir}/.sessions/
├── session-2026-02-16-143000.json  # Generated session files
└── session-2026-02-16-154530.json
```

**Important**:
- **Framework files** (docs, schema, scripts) live in `.atta/` and are committed
- **Generated session files** live in `{claudeDir}/.sessions/` where `{claudeDir}` is determined by your settings
- By default, `{claudeDir}` is `.claude/` (can be customized in settings.json)

### Session Schema
Each session file contains:
```json
{
  "schemaVersion": "1.0.0",
  "sessionId": "unique-uuid",
  "timestamp": "2026-02-16T14:30:00.000Z",
  "startedBy": "user | skill | agent",
  "skill": {
    "name": "init",
    "args": "",
    "status": "in_progress | completed | failed | interrupted"
  },
  "agents": [
    {
      "name": "project-owner",
      "role": "coordinator",
      "invokedAt": "2026-02-16T14:30:05.000Z",
      "status": "in_progress | completed | failed"
    }
  ],
  "metadata": {
    "projectPath": "/path/to/project",
    "claudeDir": ".claude",
    "duration": 45000,
    "tokensUsed": null,
    "costUSD": null
  }
}
```

## Retention Policy
- Keep last **10 sessions** only
- Older sessions automatically deleted
- Lightweight tracking (no conversation logs)

## Future Integration Points
- Token/cost tracking (v3.5)
- Pattern detection (v2.5)
- Learning system (v2.5)
- Usage analytics (v3.5)

## Privacy
- No conversation content stored
- Only metadata: timestamps, skill names, agent invocations
- Local storage only (never transmitted)
