#!/usr/bin/env bash

# Pattern Correction Logger
# Appends a correction event to {claudeDir}/.context/corrections.jsonl
# Usage:
#   .claude/scripts/pattern-log.sh {claudeDir} '{"category":"correction","pattern":"key","description":"...","context":{},"source":"manual"}'
#   .claude/scripts/pattern-log.sh              '{"category":"correction","pattern":"key","description":"...","context":{},"source":"manual"}'
#
# Optional fields: "outcome" ("accepted"|"rejected"), "agentId" (agent whose suggestion is being evaluated)

set -euo pipefail

# Determine Claude directory and JSON payload
if [ $# -ge 2 ]; then
  CLAUDE_DIR="$1"
  JSON_PAYLOAD="$2"
elif [ $# -eq 1 ]; then
  JSON_PAYLOAD="$1"
  CLAUDE_DIR=""
else
  echo "Usage: pattern-log.sh [claudeDir] '{json-payload}'" >&2
  exit 1
fi

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

CONTEXT_DIR="$CLAUDE_DIR/.context"
CORRECTIONS_FILE="$CONTEXT_DIR/corrections.jsonl"

# Require python3 for safe JSON handling
if ! command -v python3 >/dev/null 2>&1; then
  echo "Warning: python3 required for pattern logging but not found." >&2
  exit 0
fi

# Ensure context directory exists
mkdir -p "$CONTEXT_DIR"

# Append correction event — Python handles ID generation, timestamp, and safe serialization
python3 -c "
import json, sys, os, uuid
from datetime import datetime, timezone

payload_str = sys.argv[1]
corrections_file = sys.argv[2]

try:
    payload = json.loads(payload_str)
except json.JSONDecodeError as e:
    print('Error: Invalid JSON payload: %s' % e, file=sys.stderr)
    sys.exit(1)

# Validate required fields
required = ['category', 'pattern', 'description', 'source']
missing = [field for field in required if field not in payload]
if missing:
    print('Error: Missing required fields: %s' % missing, file=sys.stderr)
    sys.exit(1)

# Validate category
valid_categories = ['correction', 'anti-pattern', 'command-sequence']
if payload['category'] not in valid_categories:
    print('Error: Invalid category \"%s\". Must be one of: %s' % (payload['category'], valid_categories), file=sys.stderr)
    sys.exit(1)

# Validate source field
valid_sources = ['librarian', 'manual', 'skill-annotation']
if payload['source'] not in valid_sources:
    print('Error: Invalid source \"%s\". Must be one of: %s' % (payload['source'], valid_sources), file=sys.stderr)
    sys.exit(1)

# Generate correction ID: COR-UUID (race-condition-free)
now = datetime.now(timezone.utc)
correction_id = 'COR-%s' % uuid.uuid4().hex[:12]

# Build the full event
event = {
    'id': correction_id,
    'timestamp': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
    'sessionId': payload.get('sessionId', ''),
    'skill': payload.get('skill', ''),
    'category': payload['category'],
    'pattern': payload['pattern'],
    'description': payload['description'],
    'context': payload.get('context', {}),
    'source': payload['source'],
    'promoted': False,
}

# Optional fields — only include when present (backward-compatible)
if payload.get('outcome') in ('accepted', 'rejected'):
    event['outcome'] = payload['outcome']
if payload.get('agentId'):
    event['agentId'] = payload['agentId']

# Append to JSONL (one line, no trailing whitespace)
with open(corrections_file, 'a') as f:
    f.write(json.dumps(event, ensure_ascii=False) + '\n')

print('Logged %s: %s (%s)' % (correction_id, payload['pattern'], payload['category']))
" "$JSON_PAYLOAD" "$CORRECTIONS_FILE"
