#!/usr/bin/env bash

# Pattern Correction Logger
# Appends a correction event to {claudeDir}/.context/corrections.jsonl
# Usage:
#   .claude/scripts/pattern-log.sh {claudeDir} '{"category":"correction","pattern":"key","description":"...","context":{},"source":"manual"}'
#   .claude/scripts/pattern-log.sh              '{"category":"correction","pattern":"key","description":"...","context":{},"source":"manual"}'
#   .claude/scripts/pattern-log.sh {claudeDir} << 'PAYLOAD'
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

# Determine Claude directory and JSON payload
# Supports three calling conventions:
#   pattern-log.sh <claudeDir> '<json>'       # both as arguments
#   pattern-log.sh '<json>'                   # payload only, auto-detect claudeDir
#   pattern-log.sh <claudeDir> <<< '<json>'   # payload via stdin (safe for untrusted text)
if [ $# -ge 2 ]; then
  CLAUDE_DIR="$1"
  JSON_PAYLOAD="$2"
elif [ $# -eq 1 ]; then
  # Check if stdin has data (heredoc/pipe) — if so, $1 is claudeDir
  if [ ! -t 0 ]; then
    CLAUDE_DIR="$1"
    JSON_PAYLOAD="$(cat)"
  else
    JSON_PAYLOAD="$1"
    CLAUDE_DIR=""
  fi
elif [ $# -eq 0 ] && [ ! -t 0 ]; then
  CLAUDE_DIR=""
  JSON_PAYLOAD="$(cat)"
else
  echo "Usage: pattern-log.sh [claudeDir] '{json-payload}'" >&2
  echo "       pattern-log.sh <claudeDir> <<< '{json-payload}'" >&2
  exit 1
fi

resolve_claude_dir
validate_claude_dir

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
