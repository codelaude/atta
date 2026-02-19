# Session Tracking

**Version**: v2.2
**Status**: Foundation (Enables v2.5+ features)

## Overview

Session tracking is a lightweight system that records metadata about skill executions and agent invocations. It doesn't log conversation content—just timestamps, which skills ran, which agents were used, and how long things took.

This infrastructure enables future intelligence features:
- **v2.5**: Pattern detection and learning from your workflow
- **v3.5**: Token/cost analytics and usage insights

## What Gets Tracked

Each time you run a skill, the system can create a session file with:

> **Note**: Session tracking is currently integrated into the `/tutorial` skill. Integration into remaining skills (`/init`, `/review`, `/agent`, etc.) is planned for a future update.

```json
{
  "schemaVersion": "1.0.0",
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "timestamp": "2026-02-16T14:30:00.000Z",
  "startedBy": "user",
  "skill": {
    "name": "review",
    "args": "",
    "status": "completed"
  },
  "agents": [
    {
      "name": "typescript",
      "role": "specialist",
      "invokedAt": "2026-02-16T14:30:05.000Z",
      "status": "completed"
    }
  ],
  "metadata": {
    "projectPath": "/path/to/your/project",
    "claudeDir": ".claude",
    "duration": 15000,
    "tokensUsed": null,
    "costUSD": null
  }
}
```

**What's tracked**:
- Skill name and arguments
- Which agents were invoked
- Timestamps and duration
- Completion status

**What's NOT tracked**:
- No conversation content
- No code snippets
- No file contents
- No user input details

## Privacy

Session tracking is **completely local**:
- Files stored in `{claudeDir}/.sessions/` on your machine
- Never transmitted anywhere
- Not included in git (automatically gitignored)
- Lightweight metadata only (~200-500 bytes per session)

## Retention Policy

The system automatically keeps only the **10 most recent sessions**. Older sessions are deleted automatically when new ones are created.

- **Storage**: ~5KB total (10 sessions × ~500 bytes)
- **Cleanup**: Automatic, no manual intervention needed
- **History**: Last 10 skill executions

## How It Works

### 1. You run a skill

```bash
/review
```

### 2. Session file created

A new file appears in `{claudeDir}/.sessions/`:
```
session-2026-02-16-143000.json
```

### 3. Agents tracked

As agents are invoked, they're added to the session:
```json
"agents": [
  {"name": "security-specialist", "status": "completed"},
  {"name": "accessibility", "status": "completed"}
]
```

### 4. Session finalized

When the skill completes:
- Status updated to "completed"
- Duration calculated
- Cleanup runs (keeps last 10)

## Future Features

### v2.5: Pattern Detection (Planned)
Session history will enable:
- "You often invoke security-specialist after accessibility—want to create a workflow?"
- "This pattern caused issues last 3 times—here's what worked instead"
- Learning from your corrections and preferences

### v3.5: Analytics Dashboard (Planned)
Session data will power:
- Which skills you use most
- Which agents provide most value
- Token usage and cost tracking
- Performance metrics

## For Developers

If you're building custom skills and want to integrate session tracking:

📖 **[Integration Guide](../.sessions/TRACKING_GUIDE.md)** - Step-by-step instructions
📖 **[Skill Template](../.sessions/SKILL_TEMPLATE.md)** - Ready-to-use template
📖 **[Example Integration](../.sessions/INTEGRATION_EXAMPLE.md)** - Before/after comparison
📖 **[Schema Reference](../.sessions/schema.json)** - Full JSON Schema

## Disabling Session Tracking

Session tracking is currently integrated into `/tutorial` only. Full integration into all skills is planned for a future update. If you prefer not to use it, you can:

1. **Delete session files manually**:
   ```bash
   rm -rf {claudeDir}/.sessions/*.json
   ```

2. **Prevent regeneration** (when integrated):
   - Skip the tracking sections in skill templates
   - Or comment out cleanup script calls

Note: Session tracking is foundational infrastructure—disabling it will prevent v2.5+ learning features from working.

## Files and Locations

### Framework Files (Committed)
```
.claude/.sessions/
├── README.md              # Technical overview
├── schema.json            # JSON Schema definition
├── TRACKING_GUIDE.md      # Developer integration guide
├── SKILL_TEMPLATE.md      # Integration template
└── INTEGRATION_EXAMPLE.md # Before/after example

.claude/scripts/
└── session-cleanup.sh     # Automatic cleanup utility
```

### Generated Files (Local, Gitignored)

> **Note**: When `{claudeDir}` is set to a custom path (e.g., a separate workspace directory), session JSON files are written there — separate from the framework docs above. When using the default (`{claudeDir}` = `.claude`), session files co-exist alongside framework docs in `.claude/.sessions/`. The `.gitignore` pattern `*.json` in `.sessions/` ensures generated session files are not committed.

```
{claudeDir}/.sessions/
├── session-2026-02-16-143000.json
├── session-2026-02-16-154530.json
└── ... (up to 10 files)
```

## Technical Details

- **Schema Version**: 1.0.0 (with migration support for future versions)
- **Storage Format**: JSON (human-readable, easy to parse)
- **File Naming**: `session-YYYY-MM-DD-HHMMSS.json`
- **UUID Standard**: v4 (RFC 4122 compliant)
- **Timestamp Format**: ISO 8601 (UTC)

## FAQ

**Q: Can other tools read these files?**
A: Yes! They're plain JSON files with a documented schema. Build your own analytics, export to CSV, or integrate with other tools.

**Q: Will this slow down skills?**
A: No. Session tracking adds <10ms overhead. File writes are small and cleanup is fast.

**Q: What if I delete .sessions/ by accident?**
A: No problem! Session tracking is non-critical. Skills will continue working. New sessions will be created as you use skills.

**Q: Can I change the retention policy?**
A: Yes. Edit `MAX_SESSIONS=10` in `.claude/scripts/session-cleanup.sh` to keep more or fewer sessions.

**Q: Is this required for the framework to work?**
A: No. Session tracking is infrastructure for future features. Current skills (v2.2) work without it. Future versions (v2.5+) will use it for pattern detection and learning.

## See Also

- **[Bootstrap System](bootstrap-system.md)** - How agent generation works
- **[MCP Setup](mcp-setup.md)** - Configure Model Context Protocol
- **[Extending the System](extending.md)** - Add custom agents
- **[Design Philosophy](philosophy.md)** - Framework principles

---

**Added in**: v2.2 (2026-02-16)
**Developed using**: Dogfooding (framework building itself)
