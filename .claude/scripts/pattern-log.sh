#!/usr/bin/env bash

# Pattern Correction Logger
# Appends a correction event to {claudeDir}/.context/corrections.jsonl
# Usage:
#   .claude/scripts/pattern-log.sh {claudeDir} '{"category":"correction","pattern":"key","description":"...","context":{},"source":"manual"}'
#   .claude/scripts/pattern-log.sh              '{"category":"correction","pattern":"key","description":"...","context":{},"source":"manual"}'

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

# Require python3 for safe JSON handling
if ! command -v python3 >/dev/null 2>&1; then
  echo "Warning: python3 required for pattern logging but not found." >&2
  exit 0
fi

# Ensure context directory exists
mkdir -p "$CONTEXT_DIR"

# Append correction event — Python handles ID generation, timestamp, and safe serialization
python3 -c "
import json, sys, os
from datetime import datetime, timezone

payload_str = sys.argv[1]
corrections_file = sys.argv[2]

try:
    payload = json.loads(payload_str)
except json.JSONDecodeError as e:
    print(f'Error: Invalid JSON payload: {e}', file=sys.stderr)
    sys.exit(1)

# Validate required fields
required = ['category', 'pattern', 'description', 'source']
missing = [f for f in required if f not in payload]
if missing:
    print(f'Error: Missing required fields: {missing}', file=sys.stderr)
    sys.exit(1)

# Validate category
valid_categories = ['correction', 'anti-pattern', 'command-sequence']
if payload['category'] not in valid_categories:
    print(f'Error: Invalid category \"{payload[\"category\"]}\". Must be one of: {valid_categories}', file=sys.stderr)
    sys.exit(1)

# Generate correction ID: COR-YYYYMMDD-NNN
now = datetime.now(timezone.utc)
date_str = now.strftime('%Y%m%d')
prefix = f'COR-{date_str}-'

# Count existing entries for today to determine sequence number
seq = 1
if os.path.isfile(corrections_file):
    with open(corrections_file, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                if entry.get('id', '').startswith(prefix):
                    seq += 1
            except json.JSONDecodeError:
                continue

correction_id = f'{prefix}{seq:03d}'

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

# Append to JSONL (one line, no trailing whitespace)
with open(corrections_file, 'a') as f:
    f.write(json.dumps(event, ensure_ascii=False) + '\n')

print(f'Logged {correction_id}: {payload[\"pattern\"]} ({payload[\"category\"]})')
" "$JSON_PAYLOAD" "$CORRECTIONS_FILE"
