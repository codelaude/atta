#!/usr/bin/env bash

# Pattern Correction Logger
# Appends a correction event to .atta/local/context/corrections.jsonl
# Usage:
#   .atta/scripts/pattern-log.sh {attaDir} '{"category":"correction","pattern":"key","description":"...","context":{},"source":"manual"}'
#   .atta/scripts/pattern-log.sh            '{"category":"correction","pattern":"key","description":"...","context":{},"source":"manual"}'
#   .atta/scripts/pattern-log.sh {attaDir} << 'PAYLOAD'
#   {"category":"correction","pattern":"key","description":"...","context":{},"source":"manual"}
#   PAYLOAD
#
# The heredoc/stdin form is preferred when description or other fields may contain
# shell metacharacters (quotes, backticks, $, etc.) — avoids shell injection risks.
#
# Optional fields: "outcome" ("accepted"|"rejected"), "agentId" (agent whose suggestion is being evaluated)

set -euo pipefail

# Load shared utilities
source "$(dirname "${BASH_SOURCE[0]}")/lib/_common.sh"

# Determine Atta directory and JSON payload
# Supports three calling conventions:
#   pattern-log.sh <attaDir> '<json>'       # both as arguments
#   pattern-log.sh '<json>'                 # payload only, auto-detect attaDir
#   pattern-log.sh <attaDir> <<< '<json>'   # payload via stdin (safe for untrusted text)
if [ $# -ge 2 ]; then
  ATTA_DIR="$1"
  JSON_PAYLOAD="$2"
elif [ $# -eq 1 ]; then
  # Check if stdin has data (heredoc/pipe) — if so, $1 is attaDir
  if [ ! -t 0 ]; then
    ATTA_DIR="$1"
    JSON_PAYLOAD="$(cat)"
  else
    JSON_PAYLOAD="$1"
    ATTA_DIR=""
  fi
elif [ $# -eq 0 ] && [ ! -t 0 ]; then
  ATTA_DIR=""
  JSON_PAYLOAD="$(cat)"
else
  echo "Usage: pattern-log.sh [attaDir] '{json-payload}'" >&2
  echo "       pattern-log.sh <attaDir> <<< '{json-payload}'" >&2
  exit 1
fi

resolve_atta_dir
validate_atta_dir

CONTEXT_DIR="$ATTA_DIR/local/context"
CORRECTIONS_FILE="$CONTEXT_DIR/corrections.jsonl"

# Require python3 for safe JSON handling
if ! command -v python3 >/dev/null 2>&1; then
  echo "Warning: python3 not found; skipping pattern logging." >&2
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
