#!/usr/bin/env bash

# Recent Work Context Generator
# Reads last 5 session files and produces .context/recent.md
# Usage:
#   .claude/scripts/generate-context.sh                    # Auto-detect from settings
#   .claude/scripts/generate-context.sh /path/to/claudeDir  # Explicit claudeDir

set -euo pipefail

# Determine Claude directory (allow override via argument)
CLAUDE_DIR="${1:-}"

if [ -z "$CLAUDE_DIR" ]; then
  # Auto-detect from settings.json or settings.local.json
  extract_claude_dir() {
    local file="$1"
    if command -v python3 >/dev/null 2>&1; then
      python3 -c "
import json,sys
try:
    d=json.load(open('$file'))
    print(d.get('claudeDir','.claude'))
except (FileNotFoundError, json.JSONDecodeError):
    print('.claude')
" 2>/dev/null
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
CONTEXT_DIR="$CLAUDE_DIR/.context"
OUTPUT_FILE="$CONTEXT_DIR/recent.md"
MAX_RECENT=5

# Ensure context directory exists
mkdir -p "$CONTEXT_DIR"

# Check if sessions directory exists
if [ ! -d "$SESSIONS_DIR" ]; then
  cat > "$OUTPUT_FILE" <<'EOF'
# Recent Work Context

*Auto-generated — do not edit manually.*

No recent sessions found. Run a skill (e.g., `/init`, `/tutorial`) to start tracking.
EOF
  exit 0
fi

# Collect last N session files (newest first by filename timestamp)
session_files=$(find "$SESSIONS_DIR" -name "session-*.json" -type f | sort -r | head -n "$MAX_RECENT")

if [ -z "$session_files" ]; then
  cat > "$OUTPUT_FILE" <<'EOF'
# Recent Work Context

*Auto-generated — do not edit manually.*

No recent sessions found. Run a skill (e.g., `/init`, `/tutorial`) to start tracking.
EOF
  exit 0
fi

# Generate recent.md using python3
python3 -c "
import json, sys, os

files = '''$session_files'''.strip().split('\n')
lines = []

for f in files:
    try:
        with open(f) as fh:
            s = json.load(fh)

        # Extract timestamp (date + time portion)
        ts = s.get('timestamp', '')
        if 'T' in ts:
            date_part = ts.split('T')[0]
            time_part = ts.split('T')[1][:5]  # HH:MM
            display_ts = f'{date_part} {time_part}'
        else:
            display_ts = ts or 'unknown'

        # Skill info
        skill = s.get('skill', {})
        skill_name = skill.get('name', 'unknown')
        skill_status = skill.get('status', 'unknown')

        # Duration
        duration_ms = s.get('metadata', {}).get('duration')
        if duration_ms and isinstance(duration_ms, (int, float)) and duration_ms > 0:
            total_secs = int(duration_ms / 1000)
            mins = total_secs // 60
            secs = total_secs % 60
            if mins > 0:
                duration_str = f'{mins}m {secs}s'
            else:
                duration_str = f'{secs}s'
        else:
            duration_str = None

        # Agents
        agents = s.get('agents', [])
        agent_names = [a.get('name', '?') for a in agents if a.get('name')]

        # Build line
        parts = [f'**{display_ts}**', f'\`/{skill_name}\` ({skill_status}']
        if duration_str:
            parts[-1] += f', {duration_str}'
        parts[-1] += ')'
        if agent_names:
            parts.append('Agents: ' + ', '.join(agent_names))

        lines.append('- ' + ' — '.join(parts))

    except (json.JSONDecodeError, FileNotFoundError, KeyError):
        continue

# Write output
header = '''# Recent Work Context

*Auto-generated from last 5 sessions. Do not edit manually.*

'''

if lines:
    print(header + '\n'.join(lines))
else:
    print(header + 'No valid session data found.')
" > "$OUTPUT_FILE"

echo "Updated $OUTPUT_FILE ($(echo "$session_files" | wc -l | tr -d ' ') session(s))"
