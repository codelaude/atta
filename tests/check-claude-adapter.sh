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
  ".claude/skills/atta-review/SKILL.md" \
  ".claude/skills/atta-preflight/SKILL.md" \
  ".claude/skills/atta-collaborate/SKILL.md" \
  ".claude/skills/atta/SKILL.md" \
  ".claude/agents/project-owner.md" \
  ".claude/agents/code-reviewer.md" \
  ".claude/hooks/hooks.json" \
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
for field in ['name', 'version', 'description', 'skills', 'agents', 'hooks']:
    if field not in data:
        print(f'FAIL: plugin.json missing field: {field}')
        sys.exit(1)
# skills/agents are directory path strings
for field in ['skills', 'agents']:
    if not isinstance(data[field], str) or not data[field].endswith('/'):
        print(f'FAIL: plugin.json {field} should be a path string ending with / (got: {data[field]!r})')
        sys.exit(1)
# hooks is a file path string (per plugin spec: hooks points to a .json file)
if not isinstance(data['hooks'], str) or not data['hooks'].endswith('.json'):
    print(f'FAIL: plugin.json hooks should be a file path ending with .json (got: {data["hooks"]!r})')
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

if [ ! -d "$WORK_DIR/.atta/team" ]; then
  echo "FAIL: .atta/team/ directory missing"
  ERRORS=$((ERRORS + 1))
fi

if [ ! -d "$WORK_DIR/.atta/scripts" ]; then
  echo "FAIL: .atta/scripts/ directory missing"
  ERRORS=$((ERRORS + 1))
fi

# Check REVIEW.md exists and has expected sections
if [ ! -s "$WORK_DIR/REVIEW.md" ]; then
  echo "FAIL: REVIEW.md missing or empty"
  ERRORS=$((ERRORS + 1))
else
  if ! grep -q "## Always check" "$WORK_DIR/REVIEW.md"; then
    echo "FAIL: REVIEW.md missing '## Always check' section"
    ERRORS=$((ERRORS + 1))
  fi
  if ! grep -q "## Style" "$WORK_DIR/REVIEW.md"; then
    echo "FAIL: REVIEW.md missing '## Style' section"
    ERRORS=$((ERRORS + 1))
  fi
  if ! grep -q "## Skip" "$WORK_DIR/REVIEW.md"; then
    echo "FAIL: REVIEW.md missing '## Skip' section"
    ERRORS=$((ERRORS + 1))
  fi
fi

# --- Review loading: Step 0b references canonical source ---
REVIEW_SKILL="$WORK_DIR/.claude/skills/atta-review/SKILL.md"
if [ -f "$REVIEW_SKILL" ]; then
  if ! grep -Fq '.atta/team/rules/' "$REVIEW_SKILL"; then
    echo "FAIL: atta-review SKILL.md Step 0b missing .atta/team/rules/ reference"
    ERRORS=$((ERRORS + 1))
  fi
  # Verify no stale per-adapter paths as primary loading targets
  for stale_path in '.github/instructions/atta-review' '.cursor/rules/atta-review' '.gemini/styleguide.md'; do
    if grep -Fq "$stale_path" "$REVIEW_SKILL"; then
      echo "FAIL: atta-review SKILL.md still references stale path: $stale_path"
      ERRORS=$((ERRORS + 1))
    fi
  done
fi

# --- Skill flags checks (v2.7.1 Track C) ---

# Check action skills have disable-model-invocation
for skill in atta-preflight atta-test atta-ship atta-update atta-migrate atta atta-patterns; do
  SKILL_FILE="$WORK_DIR/.claude/skills/$skill/SKILL.md"
  if [ -f "$SKILL_FILE" ] && ! head -10 "$SKILL_FILE" | grep -q "disable-model-invocation: true"; then
    echo "FAIL: $skill/SKILL.md missing 'disable-model-invocation: true'"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check read-only skills have allowed-tools
for skill in atta-review atta-lint atta-security-audit; do
  SKILL_FILE="$WORK_DIR/.claude/skills/$skill/SKILL.md"
  if [ -f "$SKILL_FILE" ] && ! head -10 "$SKILL_FILE" | grep -q "allowed-tools:"; then
    echo "FAIL: $skill/SKILL.md missing 'allowed-tools:'"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check skills have argument-hint
for skill in atta-review atta-preflight atta-test atta-agent atta-collaborate; do
  SKILL_FILE="$WORK_DIR/.claude/skills/$skill/SKILL.md"
  if [ -f "$SKILL_FILE" ] && ! head -10 "$SKILL_FILE" | grep -q "argument-hint:"; then
    echo "FAIL: $skill/SKILL.md missing 'argument-hint:'"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check hooks.json is valid JSON with expected events
if [ -f "$WORK_DIR/.claude/hooks/hooks.json" ]; then
  python3 - "$WORK_DIR/.claude/hooks/hooks.json" <<'PYEOF' 2>/dev/null || ERRORS=$((ERRORS + 1))
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
if 'hooks' not in data:
    print('FAIL: hooks.json missing top-level "hooks" key')
    sys.exit(1)
hooks = data['hooks']
# Enforcement hooks: PreToolUse (safety), Stop (quality gate + session-track), PostToolUse (session-track)
for event in ['PreToolUse', 'Stop', 'PostToolUse']:
    if event not in hooks:
        print(f'FAIL: hooks.json missing event: {event}')
        sys.exit(1)
PYEOF
fi

# Count total files
CLAUDE_COUNT=$(find "$WORK_DIR/.claude" -type f 2>/dev/null | wc -l | tr -d ' ' || echo 0)
ATTA_COUNT=$(find "$WORK_DIR/.atta" -type f 2>/dev/null | wc -l | tr -d ' ' || echo 0)

if [ $ERRORS -eq 0 ]; then
  echo "PASS: Claude adapter output structure correct ($CLAUDE_COUNT files in .claude/, $ATTA_COUNT files in .atta/)"
  exit 0
else
  echo "FAIL: $ERRORS errors found"
  exit 1
fi
