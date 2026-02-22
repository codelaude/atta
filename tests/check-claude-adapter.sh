#!/bin/bash
# check-claude-adapter.sh
# Verifies Claude adapter produces expected file structure
# Runs a real install to a temp directory with --yes flag

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Run adapter (non-interactive)
node "$REPO_ROOT/bin/atta.js" init --directory "$TMPDIR" --adapter claude-code --yes > /dev/null 2>&1

ERRORS=0

# Check expected paths exist
for path in \
  ".claude/skills/review/SKILL.md" \
  ".claude/skills/preflight/SKILL.md" \
  ".claude/skills/collaborate/SKILL.md" \
  ".claude/skills/atta/SKILL.md" \
  ".claude/agents/project-owner.md" \
  ".claude/agents/code-reviewer.md" \
  ".claude-plugin/plugin.json" \
  "GETTING-STARTED.md"
do
  if [ ! -e "$TMPDIR/$path" ]; then
    echo "FAIL: Missing $path"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check plugin.json is valid JSON
if [ -f "$TMPDIR/.claude-plugin/plugin.json" ]; then
  python3 -c "import json; json.load(open('$TMPDIR/.claude-plugin/plugin.json'))" 2>/dev/null || {
    echo "FAIL: plugin.json is not valid JSON"
    ERRORS=$((ERRORS + 1))
  }

  # Check plugin.json has expected fields
  python3 -c "
import json, sys
with open('$TMPDIR/.claude-plugin/plugin.json') as f:
    data = json.load(f)
for field in ['name', 'version', 'description', 'skills']:
    if field not in data:
        print(f'FAIL: plugin.json missing field: {field}')
        sys.exit(1)
if len(data['skills']) < 3:
    print(f'FAIL: plugin.json has fewer than 3 skills ({len(data[\"skills\"])})')
    sys.exit(1)
" 2>/dev/null || ERRORS=$((ERRORS + 1))
fi

# Count total files
FILE_COUNT=$(find "$TMPDIR/.claude" -type f 2>/dev/null | wc -l | tr -d ' ')

if [ $ERRORS -eq 0 ]; then
  echo "PASS: Claude adapter output structure correct ($FILE_COUNT files in .claude/)"
  exit 0
else
  echo "FAIL: $ERRORS errors found"
  exit 1
fi
