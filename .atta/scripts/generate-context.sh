#!/usr/bin/env bash

# Recent Work Context Generator
# Reads last 5 session files and produces local/context/recent.md
# Usage:
#   .atta/scripts/generate-context.sh                                    # Auto-detect (.atta/)
#   .atta/scripts/generate-context.sh <sessionsRoot> [attaRoot]          # Explicit roots
#     sessionsRoot: directory containing .sessions/ (e.g. .claude on Claude Code)
#     attaRoot:     directory containing local/context/ and .metadata/ (default: .atta)

set -euo pipefail

# Load shared utilities
source "$(dirname "${BASH_SOURCE[0]}")/lib/_common.sh"

# sessionsRoot: where session JSON files live (may differ from attaRoot on Claude Code)
SESSIONS_ROOT="${1:-.atta}"
# attaRoot: where local/context/ and .metadata/ live (always .atta in v2.7+)
ATTA_DIR="${2:-}"
resolve_atta_dir
validate_atta_dir

SESSIONS_DIR="$SESSIONS_ROOT/.sessions"
CONTEXT_DIR="$ATTA_DIR/local/context"
OUTPUT_FILE="$CONTEXT_DIR/recent.md"
MAX_RECENT=5

# Ensure context directory exists
mkdir -p "$CONTEXT_DIR"

# Check if sessions directory exists
if [ ! -d "$SESSIONS_DIR" ]; then
  cat > "$OUTPUT_FILE" <<'EOF'
# Recent Work Context

*Auto-generated — do not edit manually.*

No recent sessions found. Run a skill (e.g., `/atta`, `/atta-tutorial`) to start tracking.
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

# Generate recent.md — single Python subprocess handles sessions + patterns + staleness
# (no shell interpolation of filenames into Python source)
PATTERNS_FILE="$CONTEXT_DIR/patterns-learned.json"
MANIFEST_FILE="$ATTA_DIR/.metadata/generated-manifest.json"
python3 -c "
import json, glob, os, sys
from datetime import datetime, timezone

sessions_dir = sys.argv[1]
max_recent = int(sys.argv[2])
output_file = sys.argv[3]
patterns_file = sys.argv[4]
manifest_file = sys.argv[5]

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

# Build output
header = '''# Recent Work Context

*Auto-generated from last 5 sessions. Do not edit manually.*

'''

content = header
if lines:
    content += '\n'.join(lines)
else:
    content += 'No recent sessions found. Run a skill (e.g., \`/atta\`, \`/tutorial\`) to start tracking.'

# Append pattern detection summary (if corrections file exists)
if os.path.isfile(patterns_file):
    try:
        with open(patterns_file) as pf:
            data = json.load(pf)
        stats = data.get('stats', {})
        total = stats.get('totalCorrections', 0)
        unique = stats.get('uniquePatterns', 0)
        ready = stats.get('readyToPromote', 0)
        if total > 0:
            content += '\n\n## Patterns Detected\n\n'
            content += '- %d correction(s) across %d pattern(s)\n' % (total, unique)
            if ready > 0:
                content += '- **%d pattern(s) ready for promotion** (run \`/patterns suggest\`)\n' % ready
    except (json.JSONDecodeError, IOError):
        pass

# Append staleness detection (if manifest with detection_sources exists)
if os.path.isfile(manifest_file):
    try:
        with open(manifest_file) as mf:
            manifest = json.load(mf)
        sources = manifest.get('detection_sources', {})
        generated_at = manifest.get('generated_at', '')
        if sources and generated_at:
            # Find project root — manifest is at .atta/.metadata/generated-manifest.json
            # Project root is two levels up from manifest directory
            manifest_dir = os.path.dirname(manifest_file)
            claude_root = os.path.dirname(manifest_dir)
            project_root = manifest.get('project_root', os.path.dirname(claude_root))

            stale_files = []
            for src_file, recorded_ts in sources.items():
                full_path = os.path.join(project_root, src_file)
                if os.path.isfile(full_path):
                    current_mtime = os.path.getmtime(full_path)
                    current_iso = datetime.fromtimestamp(current_mtime, tz=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
                    if current_iso > recorded_ts:
                        stale_files.append(src_file)

            if stale_files:
                content += '\n\n## Context Staleness\n\n'
                content += '**%d file(s) changed** since last \`/atta\` scan:\n' % len(stale_files)
                for sf in stale_files:
                    content += '- \`%s\`\n' % sf
                content += '\nRun `/atta --rescan` to update project context.\n'
    except (json.JSONDecodeError, IOError, ValueError):
        pass

with open(output_file, 'w') as out:
    out.write(content)
" "$SESSIONS_DIR" "$MAX_RECENT" "$OUTPUT_FILE" "$PATTERNS_FILE" "$MANIFEST_FILE"

# Count files for status message
file_count=$(find "$SESSIONS_DIR" -name "session-*.json" -type f | head -n "$MAX_RECENT" | wc -l | tr -d ' ')
echo "Updated $OUTPUT_FILE ($file_count session(s))"
