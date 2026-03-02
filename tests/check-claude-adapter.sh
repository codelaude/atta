#!/bin/bash
# check-claude-adapter.sh
# Verifies Claude adapter produces expected file structure
# Runs a real install to a temp directory with --yes flag

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# Run adapter (non-interactive)
node "$REPO_ROOT/bin/atta.js" init --directory "$WORK_DIR" --adapter claude-code --yes > /dev/null 2>&1

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
  if [ ! -e "$WORK_DIR/$path" ]; then
    echo "FAIL: Missing $path"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check plugin.json is valid JSON
if [ -f "$WORK_DIR/.claude-plugin/plugin.json" ]; then
  python3 - "$WORK_DIR/.claude-plugin/plugin.json" <<'PYEOF' 2>/dev/null || {
import json, sys
path = sys.argv[1]
try:
    with open(path) as f:
        json.load(f)
except Exception as e:
    print(f'FAIL: plugin.json is not valid JSON: {e}')
    sys.exit(1)
PYEOF
    echo "FAIL: plugin.json is not valid JSON"
    ERRORS=$((ERRORS + 1))
  }

  # Check plugin.json has expected fields
  python3 - "$WORK_DIR/.claude-plugin/plugin.json" <<'PYEOF' 2>/dev/null || ERRORS=$((ERRORS + 1))
import json, sys
path = sys.argv[1]
with open(path) as f:
    data = json.load(f)
for field in ['name', 'version', 'description', 'skills']:
    if field not in data:
        print(f'FAIL: plugin.json missing field: {field}')
        sys.exit(1)
if len(data['skills']) < 3:
    print(f'FAIL: plugin.json has fewer than 3 skills ({len(data["skills"])})')
    sys.exit(1)
PYEOF
fi

# Check .atta/ shared content exists
if [ ! -d "$WORK_DIR/.atta/bootstrap" ]; then
  echo "FAIL: .atta/bootstrap/ directory missing"
  ERRORS=$((ERRORS + 1))
elif [ ! -f "$WORK_DIR/.atta/bootstrap/generator.md" ]; then
  echo "FAIL: .atta/bootstrap/generator.md missing"
  ERRORS=$((ERRORS + 1))
fi

if [ ! -d "$WORK_DIR/.atta/knowledge" ]; then
  echo "FAIL: .atta/knowledge/ directory missing"
  ERRORS=$((ERRORS + 1))
fi

if [ ! -d "$WORK_DIR/.atta/scripts" ]; then
  echo "FAIL: .atta/scripts/ directory missing"
  ERRORS=$((ERRORS + 1))
fi

# Count total files
CLAUDE_COUNT=$(find "$WORK_DIR/.claude" -type f 2>/dev/null | wc -l | tr -d ' ')
ATTA_COUNT=$(find "$WORK_DIR/.atta" -type f 2>/dev/null | wc -l | tr -d ' ')

if [ $ERRORS -eq 0 ]; then
  echo "PASS: Claude adapter output structure correct ($CLAUDE_COUNT files in .claude/, $ATTA_COUNT files in .atta/)"
  exit 0
else
  echo "FAIL: $ERRORS errors found"
  exit 1
fi
