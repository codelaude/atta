#!/bin/bash
# Session tracking hook for Claude Code
# Auto-creates/finalizes session JSON on skill start/end
#
# Hook configuration (in .claude/settings.local.json):
#   PostToolUse on Skill → creates session file
#   Stop                 → finalizes active session
#
# Reads JSON input from stdin (Claude Code hook protocol)

set -euo pipefail

# --- Read hook input ---
INPUT=$(cat)

extract() {
  python3 -c "
import sys, json
d = json.load(sys.stdin)
keys = sys.argv[1].split('.')
for k in keys:
    if isinstance(d, dict):
        d = d.get(k, '')
    else:
        d = ''
        break
print(d if d is not None else '')
" "$1" <<< "$INPUT" 2>/dev/null || echo ""
}

EVENT=$(extract hook_event_name)
CWD=$(extract cwd)
[ -z "$CWD" ] && exit 0

# --- Resolve claude dir (with canonicalization for path safety) ---
CLAUDE_DIR=""
if [ -f "$CWD/.env.claude" ]; then
  WS=$(grep -E '^CLAUDE_WORKSPACE_DIR=' "$CWD/.env.claude" 2>/dev/null | head -1 | cut -d= -f2 | xargs)
  [ -n "$WS" ] && CLAUDE_DIR="$CWD/$WS"
fi
[ -z "$CLAUDE_DIR" ] && CLAUDE_DIR="$CWD/.claude"

# Canonicalize both paths to prevent ../ traversal bypass
# Use python3 to resolve without creating directories (no side effects before validation)
REAL_CWD=$(cd "$CWD" && pwd -P)
REAL_CLAUDE_DIR=$(python3 -c "import os,sys; print(os.path.realpath(sys.argv[1]))" "$CLAUDE_DIR" 2>/dev/null) || exit 0

# Path containment: claude dir must be physically under cwd
case "$REAL_CLAUDE_DIR" in
  "$REAL_CWD"/*) ;;
  *) exit 0 ;;
esac

mkdir -p "$REAL_CLAUDE_DIR/.sessions"

# --- Handle events ---
case "$EVENT" in
  PostToolUse)
    TOOL=$(extract tool_name)
    [ "$TOOL" != "Skill" ] && exit 0

    SKILL_NAME=$(extract tool_input.skill)
    [ -z "$SKILL_NAME" ] && exit 0
    SKILL_ARGS=$(extract tool_input.args)

    TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
    UUID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null)
    UUID=$(echo "$UUID" | tr '[:upper:]' '[:lower:]')
    [ -z "$UUID" ] && exit 0

    ISO_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    START_TIME=$(date +%s)

    # Include UUID in filename to prevent same-second collisions
    SESSION_FILE="$REAL_CLAUDE_DIR/.sessions/session-${TIMESTAMP}-${UUID}.json"

    python3 - "$SESSION_FILE" "$UUID" "$ISO_TIME" "$SKILL_NAME" "$SKILL_ARGS" "$REAL_CWD" "$REAL_CLAUDE_DIR" "$START_TIME" << 'PYEOF'
import json, sys
path, uid, ts, skill, args, cwd, cdir, start = sys.argv[1:9]
session = {
    "schemaVersion": "1.0.0",
    "sessionId": uid,
    "timestamp": ts,
    "startedBy": "user",
    "skill": {"name": skill, "args": args, "status": "in_progress"},
    "agents": [],
    "metadata": {
        "projectPath": cwd,
        "claudeDir": cdir,
        "duration": None,
        "tokensUsed": None,
        "costUSD": None,
        "_startTime": int(start)
    }
}
with open(path, 'w') as f:
    json.dump(session, f, indent=2)
    f.write('\n')
PYEOF
    ;;

  Stop|SessionEnd)
    # Find most recent in-progress session (nullglob-safe)
    LATEST=""
    for f in "$REAL_CLAUDE_DIR/.sessions"/session-*.json; do
      [ -f "$f" ] || continue
      LATEST="$f"
    done
    [ -z "$LATEST" ] && exit 0

    # If multiple files, pick most recent by mtime
    if [ "$(echo "$REAL_CLAUDE_DIR/.sessions"/session-*.json | wc -w)" -gt 1 ] 2>/dev/null; then
      LATEST=$(python3 -c "
import glob, os, sys
files = glob.glob(sys.argv[1])
if files:
    print(max(files, key=os.path.getmtime))
" "$REAL_CLAUDE_DIR/.sessions/session-*.json" 2>/dev/null) || true
      [ -z "$LATEST" ] && exit 0
    fi

    python3 - "$LATEST" << 'PYEOF'
import json, sys, time
path = sys.argv[1]
with open(path) as f:
    session = json.load(f)
if session.get("skill", {}).get("status") != "in_progress":
    sys.exit(0)
start = session.get("metadata", {}).get("_startTime")
if start:
    session["metadata"]["duration"] = int((time.time() - float(start)) * 1000)
    del session["metadata"]["_startTime"]
session["skill"]["status"] = "completed"
with open(path, 'w') as f:
    json.dump(session, f, indent=2)
    f.write('\n')
PYEOF

    # Run cleanup and context generation
    SCRIPTS="$REAL_CWD/.claude/scripts"
    [ -f "$SCRIPTS/session-cleanup.sh" ] && bash "$SCRIPTS/session-cleanup.sh" "$REAL_CLAUDE_DIR" 2>/dev/null || true
    [ -f "$SCRIPTS/generate-context.sh" ] && bash "$SCRIPTS/generate-context.sh" "$REAL_CLAUDE_DIR" 2>/dev/null || true
    ;;
esac

exit 0
