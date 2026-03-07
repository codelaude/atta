#!/usr/bin/env bash

# Shared utilities for Atta framework scripts
# Source this file: source "$(dirname "${BASH_SOURCE[0]}")/lib/_common.sh"

# Auto-detect ATTA_DIR for shared content (sessions, context, metadata, knowledge).
# Sets the ATTA_DIR variable. Skips if ATTA_DIR is already non-empty.
# In production, .atta/ is always the shared content directory.
# In dev mode, pass the workspace path explicitly via argument or env var.
resolve_atta_dir() {
  if [ -n "${ATTA_DIR:-}" ]; then
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
