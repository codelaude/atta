#!/usr/bin/env bash

# Pattern Analysis Script
# Reads corrections.jsonl and rebuilds patterns-learned.json
# Usage:
#   .claude/scripts/pattern-analyze.sh                    # Auto-detect from settings
#   .claude/scripts/pattern-analyze.sh /path/to/claudeDir  # Explicit claudeDir

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

CONTEXT_DIR="$CLAUDE_DIR/.context"
CORRECTIONS_FILE="$CONTEXT_DIR/corrections.jsonl"
OUTPUT_FILE="$CONTEXT_DIR/patterns-learned.json"

# Check if corrections file exists
if [ ! -f "$CORRECTIONS_FILE" ]; then
  echo "No corrections found at $CORRECTIONS_FILE"
  exit 0
fi

# Require python3
if ! command -v python3 >/dev/null 2>&1; then
  echo "Warning: python3 required for pattern analysis but not found." >&2
  exit 0
fi

# Ensure context directory exists
mkdir -p "$CONTEXT_DIR"

# Aggregate corrections and rebuild patterns-learned.json
python3 -c "
import json, sys, os
from datetime import datetime, timezone
from collections import defaultdict

corrections_file = sys.argv[1]
output_file = sys.argv[2]

# Thresholds per category
THRESHOLDS = {
    'correction': 3,
    'anti-pattern': 5,
    'command-sequence': 3,
}

# Read all correction events
events = []
with open(corrections_file, 'r') as f:
    for line_num, line in enumerate(f, 1):
        line = line.strip()
        if not line:
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            print(f'Warning: Skipping malformed line {line_num} in corrections.jsonl', file=sys.stderr)

if not events:
    print('No correction events found.')
    sys.exit(0)

# Group by pattern key
groups = defaultdict(list)
for ev in events:
    groups[ev.get('pattern', 'unknown')].append(ev)

# Build pattern summaries
patterns = []
total_promoted = 0
total_ready = 0

for pattern_key, entries in sorted(groups.items()):
    # Use the most common category for this pattern
    categories = [e.get('category', 'correction') for e in entries]
    primary_category = max(set(categories), key=categories.count)
    threshold = THRESHOLDS.get(primary_category, 3)

    count = len(entries)
    ready = count >= threshold
    promoted = all(e.get('promoted', False) for e in entries)

    if ready:
        total_ready += 1
    if promoted:
        total_promoted += 1

    # Extract most recent description
    sorted_entries = sorted(entries, key=lambda e: e.get('timestamp', ''))
    description = sorted_entries[-1].get('description', '')
    first_seen = sorted_entries[0].get('timestamp', '')
    last_seen = sorted_entries[-1].get('timestamp', '')

    # Build suggested directive from context
    contexts = [e.get('context', {}) for e in entries]
    domains = [c.get('domain', '') for c in contexts if c.get('domain')]
    primary_domain = max(set(domains), key=domains.count) if domains else 'general'

    # Map domain to likely pattern file
    domain_to_file = {
        'language': f'.claude/knowledge/patterns/{primary_domain}-patterns.md',
        'framework': '.claude/knowledge/patterns/framework-patterns.md',
        'styling': '.claude/knowledge/patterns/styling-patterns.md',
        'security': '.claude/knowledge/patterns/security-patterns.md',
        'testing': '.claude/knowledge/patterns/testing-patterns.md',
        'accessibility': '.claude/knowledge/patterns/accessibility-patterns.md',
    }
    target_file = domain_to_file.get(primary_domain, f'.claude/knowledge/patterns/{primary_domain}-patterns.md')

    pattern_summary = {
        'pattern': pattern_key,
        'category': primary_category,
        'count': count,
        'threshold': threshold,
        'ready': ready,
        'firstSeen': first_seen,
        'lastSeen': last_seen,
        'description': description,
        'occurrences': [e.get('id', '') for e in entries],
        'suggestedDirective': {
            'rule': description,
            'applies_to': list(set(domains)) or ['general'],
            'targetFile': target_file,
            'targetSection': 'Anti-Patterns to Flag',
        },
        'promoted': promoted,
    }
    patterns.append(pattern_summary)

# Sort: ready-and-unpromoted first, then by count descending
patterns.sort(key=lambda p: (not (p['ready'] and not p['promoted']), -p['count']))

# Build output
now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
output = {
    'schemaVersion': '1.0.0',
    'generatedAt': now,
    'patterns': patterns,
    'stats': {
        'totalCorrections': len(events),
        'uniquePatterns': len(patterns),
        'readyToPromote': total_ready - total_promoted,
        'alreadyPromoted': total_promoted,
    },
}

with open(output_file, 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
    f.write('\n')

# Print summary
print(f'Analyzed {len(events)} correction(s) across {len(patterns)} pattern(s).')
ready_unpromoted = total_ready - total_promoted
if ready_unpromoted > 0:
    print(f'{ready_unpromoted} pattern(s) ready for promotion. Run \`/patterns suggest\` to see details.')
" "$CORRECTIONS_FILE" "$OUTPUT_FILE"
