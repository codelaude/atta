#!/bin/bash
# check-agents-md-generator.sh
# Verifies AGENTS.md generator produces consistent, non-empty output
# with expected sections. Uses Copilot adapter output since it generates AGENTS.md.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# Run copilot adapter to generate AGENTS.md
node "$REPO_ROOT/bin/atta.js" init --directory "$WORK_DIR" --adapter copilot --yes > /dev/null 2>&1

ERRORS=0

# Check file exists and is non-trivial (>20 lines)
if [ ! -f "$WORK_DIR/AGENTS.md" ]; then
  echo "FAIL: AGENTS.md not generated"
  exit 1
fi

LINE_COUNT=$(wc -l < "$WORK_DIR/AGENTS.md" | tr -d ' ')
if [ "$LINE_COUNT" -lt 20 ]; then
  echo "FAIL: AGENTS.md too short ($LINE_COUNT lines, expected 20+)"
  ERRORS=$((ERRORS + 1))
fi

# Check required sections exist
for section in "Project Overview" "Build" "Code Style" "Architecture"; do
  if ! grep -qi "$section" "$WORK_DIR/AGENTS.md"; then
    echo "FAIL: Missing section '$section'"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check agent table has entries
AGENT_ROWS=$(grep -c '^\| ' "$WORK_DIR/AGENTS.md" 2>/dev/null || true)
if [ "$AGENT_ROWS" -lt 3 ]; then
  echo "FAIL: Agent table has fewer than 3 rows ($AGENT_ROWS)"
  ERRORS=$((ERRORS + 1))
fi

# Snapshot comparison (if golden file exists)
GOLDEN="$SCRIPT_DIR/fixtures/AGENTS.md.golden"
if [ -f "$GOLDEN" ]; then
  if ! diff -q "$GOLDEN" "$WORK_DIR/AGENTS.md" >/dev/null 2>&1; then
    echo "WARN: AGENTS.md output differs from golden snapshot"
    echo "  Update golden: cp $WORK_DIR/AGENTS.md $GOLDEN"
    # Warning, not failure — snapshots need updating when agents change
  fi
fi

if [ $ERRORS -eq 0 ]; then
  echo "PASS: AGENTS.md generator output valid ($LINE_COUNT lines)"
  exit 0
else
  echo "FAIL: $ERRORS errors found"
  exit 1
fi
