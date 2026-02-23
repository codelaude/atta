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
    d=json.load(open(sys.argv[1]))
    print(d.get('claudeDir','.claude'))
except (FileNotFoundError, json.JSONDecodeError):
    print('.claude')
" "$file" 2>/dev/null
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

# Path containment: ensure CLAUDE_DIR physically resolves inside the project root
# Uses pwd -P to resolve symlinks — prevents symlink-to-outside-root bypass
PROJECT_ROOT="$(pwd -P)"
if [ -d "$CLAUDE_DIR" ]; then
  CLAUDE_DIR_REAL=$(cd "$CLAUDE_DIR" && pwd -P)
else
  # Directory doesn't exist yet — resolve parent + basename (reject if parent is outside root)
  CLAUDE_DIR_PARENT=$(cd "$(dirname "$CLAUDE_DIR")" 2>/dev/null && pwd -P) || { echo "Error: claudeDir parent does not exist" >&2; exit 1; }
  CLAUDE_DIR_REAL="$CLAUDE_DIR_PARENT/$(basename "$CLAUDE_DIR")"
fi
case "$CLAUDE_DIR_REAL" in "$PROJECT_ROOT"/*) ;; *) echo "Error: claudeDir escapes project root" >&2; exit 1 ;; esac

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

No recent sessions found. Run a skill (e.g., `/atta`, `/tutorial`) to start tracking.
EOF
  exit 0
fi

# Require python3 for JSON parsing
if ! command -v python3 >/dev/null 2>&1; then
  cat > "$OUTPUT_FILE" <<'EOF'
# Recent Work Context

*Auto-generated — do not edit manually.*

Unable to generate context: python3 is required but not found.
EOF
  echo "Warning: python3 not found. Wrote placeholder to $OUTPUT_FILE" >&2
  exit 0
fi

# Generate recent.md — Python discovers and parses session files directly
# (no shell interpolation of filenames into Python source)
python3 -c "
import json, glob, os, sys

sessions_dir = sys.argv[1]
max_recent = int(sys.argv[2])

# Discover session files (newest first by filename timestamp)
pattern = os.path.join(sessions_dir, 'session-*.json')
files = sorted(glob.glob(pattern), reverse=True)[:max_recent]

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
            display_ts = '%s %s' % (date_part, time_part)
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
                duration_str = '%dm %ds' % (mins, secs)
            else:
                duration_str = '%ds' % secs
        else:
            duration_str = None

        # Agents
        agents = s.get('agents', [])
        agent_names = [a.get('name', '?') for a in agents if a.get('name')]

        # Build line
        parts = ['**%s**' % display_ts, '\`/%s\` (%s' % (skill_name, skill_status)]
        if duration_str:
            parts[-1] += ', %s' % duration_str
        parts[-1] += ')'
        if agent_names:
            parts.append('Agents: ' + ', '.join(agent_names))

        lines.append('- ' + ' \u2014 '.join(parts))

    except (json.JSONDecodeError, FileNotFoundError, KeyError):
        continue

# Write output
header = '''# Recent Work Context

*Auto-generated from last 5 sessions. Do not edit manually.*

'''

if lines:
    print(header + '\n'.join(lines))
else:
    print(header + 'No recent sessions found. Run a skill (e.g., \`/atta\`, \`/tutorial\`) to start tracking.')
" "$SESSIONS_DIR" "$MAX_RECENT" > "$OUTPUT_FILE"

# Append pattern detection summary (if corrections exist)
PATTERNS_FILE="$CONTEXT_DIR/patterns-learned.json"
if [ -f "$PATTERNS_FILE" ] && command -v python3 >/dev/null 2>&1; then
  python3 -c "
import json, sys

patterns_file = sys.argv[1]
output_file = sys.argv[2]

try:
    with open(patterns_file) as f:
        data = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    sys.exit(0)

stats = data.get('stats', {})
total = stats.get('totalCorrections', 0)
unique = stats.get('uniquePatterns', 0)
ready = stats.get('readyToPromote', 0)

if total == 0:
    sys.exit(0)

section = '\n## Patterns Detected\n\n'
section += '- %d correction(s) across %d pattern(s)\n' % (total, unique)
if ready > 0:
    section += '- **%d pattern(s) ready for promotion** (run \`/patterns suggest\`)\n' % ready

with open(output_file, 'a') as f:
    f.write(section)
" "$PATTERNS_FILE" "$OUTPUT_FILE"
fi

# Count files for status message
file_count=$(find "$SESSIONS_DIR" -name "session-*.json" -type f | head -n "$MAX_RECENT" | wc -l | tr -d ' ')
echo "Updated $OUTPUT_FILE ($file_count session(s))"
