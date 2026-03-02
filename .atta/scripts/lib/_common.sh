#!/usr/bin/env bash

# Shared utilities for Atta framework scripts
# Source this file: source "$(dirname "${BASH_SOURCE[0]}")/lib/_common.sh"

# Extract claudeDir from a settings JSON file.
# Falls back to '.claude' if the file is missing or unparseable.
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

# Auto-detect CLAUDE_DIR from settings files.
# Sets the CLAUDE_DIR variable. Skips if CLAUDE_DIR is already non-empty.
resolve_claude_dir() {
  if [ -n "$CLAUDE_DIR" ]; then
    return
  fi

  if [ -f ".claude/settings.local.json" ]; then
    CLAUDE_DIR=$(extract_claude_dir ".claude/settings.local.json")
  elif [ -f ".claude/settings.json" ]; then
    CLAUDE_DIR=$(extract_claude_dir ".claude/settings.json")
  else
    CLAUDE_DIR=".claude"
  fi
}

# Validate that CLAUDE_DIR resolves inside the project root.
# Exits with error if path escapes the project root (symlink bypass protection).
validate_claude_dir() {
  local project_root
  project_root="$(pwd -P)"

  local claude_dir_real
  if [ -d "$CLAUDE_DIR" ]; then
    claude_dir_real=$(cd "$CLAUDE_DIR" && pwd -P)
  else
    # Directory doesn't exist yet — resolve parent + basename (reject if parent is outside root)
    local claude_dir_parent
    claude_dir_parent=$(cd "$(dirname "$CLAUDE_DIR")" 2>/dev/null && pwd -P) || {
      echo "Error: claudeDir parent does not exist" >&2
      exit 1
    }
    claude_dir_real="$claude_dir_parent/$(basename "$CLAUDE_DIR")"
  fi

  case "$claude_dir_real" in
    "$project_root"/*) ;;
    *) echo "Error: claudeDir escapes project root" >&2; exit 1 ;;
  esac
}

# Auto-detect ATTA_DIR for shared content (sessions, context, metadata, knowledge).
# Sets the ATTA_DIR variable. Skips if ATTA_DIR is already non-empty.
# In production, .atta/ is always the shared content directory.
# In dev mode, pass the workspace path explicitly via argument or env var.
resolve_atta_dir() {
  if [ -n "$ATTA_DIR" ]; then
    return
  fi
  ATTA_DIR=".atta"
}

# Validate that ATTA_DIR resolves inside the project root.
# Exits with error if path escapes the project root (symlink bypass protection).
validate_atta_dir() {
  local project_root
  project_root="$(pwd -P)"

  local atta_dir_real
  if [ -d "$ATTA_DIR" ]; then
    atta_dir_real=$(cd "$ATTA_DIR" && pwd -P)
  else
    local atta_dir_parent
    atta_dir_parent=$(cd "$(dirname "$ATTA_DIR")" 2>/dev/null && pwd -P) || {
      echo "Error: attaDir parent does not exist" >&2
      exit 1
    }
    atta_dir_real="$atta_dir_parent/$(basename "$ATTA_DIR")"
  fi

  case "$atta_dir_real" in
    "$project_root"/*) ;;
    *) echo "Error: attaDir escapes project root" >&2; exit 1 ;;
  esac
}
