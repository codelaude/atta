#!/bin/bash
# check-plugin-generator.sh
# Verifies `atta plugin` produces correct output for all targets

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

ERRORS=0

# Helper: count files matching pattern in a directory (safe under pipefail)
count_files() {
  local dir="$1" pattern="$2"
  if [ -d "$dir" ]; then
    find "$dir" -name "$pattern" 2>/dev/null | wc -l | tr -d ' '
  else
    echo 0
  fi
}

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
CC_SKILL_COUNT=$(count_files "$DIR/skills" "SKILL.md")
if [ "$CC_SKILL_COUNT" -eq 0 ]; then
  echo "FAIL: [claude-code] No SKILL.md files in skills/"
  ERRORS=$((ERRORS + 1))
fi

# Agents directory has .md files
CC_AGENT_COUNT=0
if [ -d "$DIR/agents" ]; then
  CC_AGENT_COUNT=$(find "$DIR/agents" -name "*.md" -not -path "*/memory/*" 2>/dev/null | wc -l | tr -d ' ')
fi
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

# Agents directory has .agent.md files (Copilot requires this extension)
COP_AGENT_COUNT=0
if [ -d "$DIR/agents" ]; then
  COP_AGENT_COUNT=$(find "$DIR/agents" -name "*.agent.md" -not -path "*/memory/*" 2>/dev/null | wc -l | tr -d ' ')
fi
if [ "$COP_AGENT_COUNT" -eq 0 ]; then
  echo "FAIL: [copilot] No .agent.md definitions in agents/"
  ERRORS=$((ERRORS + 1))
fi

# Plain .md agents should NOT exist (should all be .agent.md)
COP_PLAIN_MD=0
if [ -d "$DIR/agents" ]; then
  # Count .md files that are NOT .agent.md
  COP_PLAIN_MD=$({ find "$DIR/agents" -name "*.md" -not -name "*.agent.md" -not -path "*/memory/*" 2>/dev/null || true; } | wc -l | tr -d ' ')
fi
if [ "$COP_PLAIN_MD" -gt 0 ]; then
  echo "FAIL: [copilot] Found $COP_PLAIN_MD plain .md agents (should be .agent.md)"
  ERRORS=$((ERRORS + 1))
fi

# Agents should not contain model: inherit
COP_MODEL_INHERIT=$({ grep -rl 'model: inherit' "$DIR/agents" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$COP_MODEL_INHERIT" -gt 0 ]; then
  echo "FAIL: [copilot] $COP_MODEL_INHERIT agent files contain 'model: inherit'"
  ERRORS=$((ERRORS + 1))
fi

# hooks.json should have version field
if [ -f "$DIR/hooks/hooks.json" ]; then
  python3 - "$DIR/hooks/hooks.json" <<'PYEOF' || ERRORS=$((ERRORS + 1))
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
if data.get('version') != 1:
    print('FAIL: [copilot] hooks.json missing version: 1')
    sys.exit(1)
PYEOF
fi

echo "[copilot] $COP_AGENT_COUNT .agent.md agents"

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
CUR_RULE_COUNT=$(count_files "$DIR/rules" "*.mdc")
if [ "$CUR_RULE_COUNT" -eq 0 ]; then
  echo "FAIL: [cursor] No .mdc rule files in rules/"
  ERRORS=$((ERRORS + 1))
fi

# Must have atta.mdc (always-applied framework context)
if [ ! -f "$DIR/rules/atta.mdc" ]; then
  echo "FAIL: [cursor] rules/atta.mdc missing (always-applied context)"
  ERRORS=$((ERRORS + 1))
fi

# Agents should not contain model: inherit
CUR_MODEL_INHERIT=$({ grep -rl 'model: inherit' "$DIR/agents" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$CUR_MODEL_INHERIT" -gt 0 ]; then
  echo "FAIL: [cursor] $CUR_MODEL_INHERIT agent files contain 'model: inherit'"
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
  ".codex/config.toml" \
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

# Skills use $prefix (not / prefix) — check backticked slash commands
# Uses || true to prevent pipefail abort when grep finds no matches
CDX_SLASH_COUNT=$({ grep -rl '`/[a-z]' "$DIR/skills" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$CDX_SLASH_COUNT" -gt 0 ]; then
  echo "FAIL: [codex] $CDX_SLASH_COUNT skill files contain backticked /command instead of \$command"
  ERRORS=$((ERRORS + 1))
fi

# Agents should not contain model: inherit
CDX_MODEL_INHERIT=$({ grep -rl 'model: inherit' "$DIR/agents" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$CDX_MODEL_INHERIT" -gt 0 ]; then
  echo "FAIL: [codex] $CDX_MODEL_INHERIT agent files contain 'model: inherit'"
  ERRORS=$((ERRORS + 1))
fi

# config.toml should have [agents.*] sections
if [ -f "$DIR/.codex/config.toml" ]; then
  CDX_TOML_AGENTS=$({ grep -c '^\[agents\.' "$DIR/.codex/config.toml" 2>/dev/null || true; })
  if [ "$CDX_TOML_AGENTS" -eq 0 ]; then
    echo "FAIL: [codex] config.toml has no [agents.*] sections"
    ERRORS=$((ERRORS + 1))
  fi
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
