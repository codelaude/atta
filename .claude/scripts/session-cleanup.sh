#!/usr/bin/env bash

# Session Cleanup Script
# Keeps only the 10 most recent session files
# Usage:
#   .claude/scripts/session-cleanup.sh                    # Auto-detect from settings
#   .claude/scripts/session-cleanup.sh /path/to/claudeDir  # Explicit claudeDir

set -euo pipefail

# Determine Claude directory (allow override via argument)
CLAUDE_DIR="${1:-}"

if [ -z "$CLAUDE_DIR" ]; then
  # Auto-detect from settings.json or settings.local.json
  # Try python3 first (robust JSON parsing), fall back to grep
  extract_claude_dir() {
    local file="$1"
    if command -v python3 >/dev/null 2>&1; then
      python3 -c "import json,sys; d=json.load(open('$file')); print(d.get('claudeDir','.claude'))" 2>/dev/null
    else
      grep -o '"claudeDir" *: *"[^"]*"' "$file" 2>/dev/null | sed 's/.*: *"//;s/"//' || echo ".claude"
    fi
  }

  if [ -f ".claude/settings.local.json" ]; then
    CLAUDE_DIR=$(extract_claude_dir ".claude/settings.local.json")
  elif [ -f ".claude/settings.json" ]; then
    CLAUDE_DIR=$(extract_claude_dir ".claude/settings.json")
  else
    CLAUDE_DIR=".claude"
  fi
fi

SESSIONS_DIR="$CLAUDE_DIR/.sessions"
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
# Sort alphabetically (oldest first), take first $to_delete files, delete them
# Use -print0/-0 to safely handle filenames with spaces or special characters
find "$SESSIONS_DIR" -name "session-*.json" -type f -print0 | sort -z | head -z -n "$to_delete" | xargs -0 -r rm -f

echo "Deleted $to_delete old session(s). Kept $MAX_SESSIONS most recent."
