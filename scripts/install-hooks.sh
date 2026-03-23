#!/usr/bin/env bash
# Install git hooks for local development.
# Run once after cloning: npm run setup

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_SRC="$REPO_ROOT/scripts/hooks"
HOOKS_DIR="$(git -C "$REPO_ROOT" rev-parse --git-path hooks)"

install_hook() {
  local name="$1"
  if [ ! -f "$HOOKS_SRC/$name" ]; then
    echo "ERROR: hook source not found: $HOOKS_SRC/$name" >&2
    exit 1
  fi
  if [ -f "$HOOKS_DIR/$name" ]; then
    if cmp -s "$HOOKS_SRC/$name" "$HOOKS_DIR/$name"; then
      echo "  already installed: $name"
      return 0
    fi
    local backup="$HOOKS_DIR/$name.bak"
    echo "  backing up existing hook to: $backup"
    mv "$HOOKS_DIR/$name" "$backup"
  fi
  cp "$HOOKS_SRC/$name" "$HOOKS_DIR/$name"
  chmod +x "$HOOKS_DIR/$name"
  echo "  installed: $name"
}

echo "Checking Python test dependencies..."
if ! python3 -c "import yaml, jsonschema" 2>/dev/null; then
  echo "ERROR: pyyaml and jsonschema are required by the test suite but are not installed."
  echo "Install them first, then re-run 'npm run setup':"
  echo "  python3 -m pip install pyyaml jsonschema"
  echo "  python3 -m pip install --break-system-packages pyyaml jsonschema  # Homebrew Python"
  exit 1
fi
echo "  Python deps: ok"

echo "Installing git hooks..."
install_hook pre-push

echo "Done. Run 'npm test' to verify the test suite passes."
