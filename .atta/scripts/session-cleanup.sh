#!/usr/bin/env bash

# Session Cleanup Script
# Keeps only the 10 most recent session files
# Usage:
#   .atta/scripts/session-cleanup.sh .claude                  # Claude Code (sessions in .claude/.sessions/)
#   .atta/scripts/session-cleanup.sh /path/to/sessionsRoot   # Explicit sessions root
#   .atta/scripts/session-cleanup.sh                         # Fallback (.atta/local — usually no-op)

set -euo pipefail

# Load shared utilities
source "$(dirname "${BASH_SOURCE[0]}")/lib/_common.sh"

# sessionsRoot: parent of .sessions/ where session JSONs live.
# Claude Code: pass $REAL_CLAUDE_DIR → .claude/.sessions/
# Default (.atta/local) is a no-op fallback — session JSONs live in {claudeDir}.
SESSIONS_ROOT="${1:-.atta/local}"
SESSIONS_DIR="$SESSIONS_ROOT/.sessions"
MAX_SESSIONS=10

# Check if sessions directory exists
if [ ! -d "$SESSIONS_DIR" ]; then
  echo "No sessions directory found at $SESSIONS_DIR"
  exit 0
fi

# Count session files
session_count=$(find "$SESSIONS_DIR" -name "session-*.json" -type f | wc -l | tr -d ' ')

if [ "$session_count" -le "$MAX_SESSIONS" ]; then
  # echo "Session count ($session_count) within limit ($MAX_SESSIONS)"
  exit 0
fi

# Calculate how many to delete
to_delete=$((session_count - MAX_SESSIONS))

# Delete oldest sessions (by filename, which includes timestamp)
# Use null-delimited mode end-to-end to avoid filename parsing vulnerabilities.
if command -v python3 >/dev/null 2>&1; then
  # Python for cross-platform sorting/selection (GNU/BSD compatible)
  find "$SESSIONS_DIR" -name "session-*.json" -type f -print0 \
    | python3 -c "
import sys
n = int(sys.argv[1])
paths = [p for p in sys.stdin.buffer.read().split(b'\0') if p]
for p in sorted(paths)[:n]:
    sys.stdout.buffer.write(p + b'\0')
" "$to_delete" \
    | xargs -0 rm -f
else
  echo "Warning: python3 is required for safe session cleanup. Skipping deletion." >&2
  exit 1
fi

echo "Deleted $to_delete old session(s). Kept $MAX_SESSIONS most recent."
