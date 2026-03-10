#!/bin/bash
# check-plugin-generator.sh
# Verifies `atta plugin` produces correct output for all targets

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

ERRORS=0

# ─── Claude Code Plugin ──────────────────────────────────────────────────────

echo "[claude-code] Generating plugin..."
node "$REPO_ROOT/bin/atta.js" plugin --target claude-code --output "$WORK_DIR" > /dev/null 2>&1

DIR="$WORK_DIR/claude-code"

# Structure checks
for path in \
  ".claude-plugin/plugin.json" \
  "skills" \
  "agents" \
  "hooks/hooks.json" \
  "settings.json" \
  "README.md"
do
  if [ ! -e "$DIR/$path" ]; then
    echo "FAIL: [claude-code] Missing $path"
    ERRORS=$((ERRORS + 1))
  fi
done

# plugin.json is valid JSON with required fields
if [ -f "$DIR/.claude-plugin/plugin.json" ]; then
  python3 - "$DIR/.claude-plugin/plugin.json" <<'PYEOF' || ERRORS=$((ERRORS + 1))
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
for field in ['name', 'version', 'description', 'skills', 'agents', 'hooks']:
    if field not in data:
        print(f'FAIL: [claude-code] plugin.json missing field: {field}')
        sys.exit(1)
# skills and agents are directory path strings
for field in ['skills', 'agents']:
    if not isinstance(data[field], str) or not data[field].endswith('/'):
        print(f'FAIL: [claude-code] plugin.json {field} should be a path string ending with / (got: {data[field]!r})')
        sys.exit(1)
# hooks is a file path string
if not isinstance(data['hooks'], str) or not data['hooks'].endswith('.json'):
    print(f'FAIL: [claude-code] plugin.json hooks should be a path string ending with .json (got: {data["hooks"]!r})')
    sys.exit(1)
PYEOF
fi

# Skills directory has SKILL.md files
CC_SKILL_COUNT=$(find "$DIR/skills" -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$CC_SKILL_COUNT" -eq 0 ]; then
  echo "FAIL: [claude-code] No SKILL.md files in skills/"
  ERRORS=$((ERRORS + 1))
fi

# Agents directory has .md files
CC_AGENT_COUNT=$(find "$DIR/agents" -name "*.md" -not -path "*/memory/*" 2>/dev/null | wc -l | tr -d ' ')
if [ "$CC_AGENT_COUNT" -eq 0 ]; then
  echo "FAIL: [claude-code] No agent definitions in agents/"
  ERRORS=$((ERRORS + 1))
fi

# hooks.json is valid JSON
if [ -f "$DIR/hooks/hooks.json" ]; then
  python3 -c "import json; json.load(open('$DIR/hooks/hooks.json'))" 2>/dev/null || {
    echo "FAIL: [claude-code] hooks/hooks.json is not valid JSON"
    ERRORS=$((ERRORS + 1))
  }
fi

echo "[claude-code] $CC_SKILL_COUNT skills, $CC_AGENT_COUNT agents"

# ─── Copilot Plugin ──────────────────────────────────────────────────────────

echo "[copilot] Generating plugin..."
node "$REPO_ROOT/bin/atta.js" plugin --target copilot --output "$WORK_DIR" > /dev/null 2>&1

DIR="$WORK_DIR/copilot"

# Structure checks
for path in \
  "plugin.json" \
  "skills" \
  "agents" \
  "hooks/hooks.json" \
  "instructions" \
  "README.md"
do
  if [ ! -e "$DIR/$path" ]; then
    echo "FAIL: [copilot] Missing $path"
    ERRORS=$((ERRORS + 1))
  fi
done

# Conflict renames: review, agent, update should be prefixed
for conflict in review agent update; do
  if [ -d "$DIR/skills/$conflict" ]; then
    echo "FAIL: [copilot] skills/$conflict not renamed (should be atta-$conflict)"
    ERRORS=$((ERRORS + 1))
  fi
  if [ ! -d "$DIR/skills/atta-$conflict" ]; then
    echo "FAIL: [copilot] skills/atta-$conflict missing (conflict rename)"
    ERRORS=$((ERRORS + 1))
  fi
done

# Agents use .agent.md extension
COP_AGENT_MD=$(find "$DIR/agents" -maxdepth 1 -name "*.md" ! -name "*.agent.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$COP_AGENT_MD" -gt 0 ]; then
  echo "FAIL: [copilot] $COP_AGENT_MD agent files not renamed to .agent.md"
  ERRORS=$((ERRORS + 1))
fi

echo "[copilot] OK"

# ─── Cursor Plugin ───────────────────────────────────────────────────────────

echo "[cursor] Generating plugin..."
node "$REPO_ROOT/bin/atta.js" plugin --target cursor --output "$WORK_DIR" > /dev/null 2>&1

DIR="$WORK_DIR/cursor"

# Structure checks
for path in \
  ".cursor-plugin/plugin.json" \
  "rules" \
  "skills" \
  "agents" \
  "hooks/hooks.json" \
  "README.md"
do
  if [ ! -e "$DIR/$path" ]; then
    echo "FAIL: [cursor] Missing $path"
    ERRORS=$((ERRORS + 1))
  fi
done

# Rules directory has .mdc files
CUR_RULE_COUNT=$(find "$DIR/rules" -name "*.mdc" 2>/dev/null | wc -l | tr -d ' ')
if [ "$CUR_RULE_COUNT" -eq 0 ]; then
  echo "FAIL: [cursor] No .mdc rule files in rules/"
  ERRORS=$((ERRORS + 1))
fi

# Must have atta.mdc (always-applied framework context)
if [ ! -f "$DIR/rules/atta.mdc" ]; then
  echo "FAIL: [cursor] rules/atta.mdc missing (always-applied context)"
  ERRORS=$((ERRORS + 1))
fi

echo "[cursor] $CUR_RULE_COUNT rules"

# ─── Codex Plugin ────────────────────────────────────────────────────────────

echo "[codex] Generating plugin..."
node "$REPO_ROOT/bin/atta.js" plugin --target codex --output "$WORK_DIR" > /dev/null 2>&1

DIR="$WORK_DIR/codex"

# Structure checks
for path in \
  "skills" \
  "agents" \
  "AGENTS.md" \
  "README.md"
do
  if [ ! -e "$DIR/$path" ]; then
    echo "FAIL: [codex] Missing $path"
    ERRORS=$((ERRORS + 1))
  fi
done

# AGENTS.md references .agents/agents/ (not .claude/agents/)
if grep -q '\.claude/agents' "$DIR/AGENTS.md" 2>/dev/null; then
  echo "FAIL: [codex] AGENTS.md references .claude/agents/ (should be .agents/agents/)"
  ERRORS=$((ERRORS + 1))
fi

# Skills use $prefix (not / prefix)
CDX_SLASH_COUNT=$({ grep -rl "Run \`/" "$DIR/skills" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$CDX_SLASH_COUNT" -gt 0 ]; then
  echo "FAIL: [codex] $CDX_SLASH_COUNT skill files use / prefix instead of \$ prefix"
  ERRORS=$((ERRORS + 1))
fi

echo "[codex] OK"

# ─── Summary ─────────────────────────────────────────────────────────────────

if [ $ERRORS -eq 0 ]; then
  echo "PASS: Plugin generator — all 4 targets correct"
  exit 0
else
  echo "FAIL: $ERRORS errors found"
  exit 1
fi
