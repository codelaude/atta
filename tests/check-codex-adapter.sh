#!/bin/bash
# check-codex-adapter.sh
# Verifies Codex adapter produces expected file structure and content correctness

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# Run adapter (non-interactive)
node "$REPO_ROOT/bin/atta.js" init --directory "$WORK_DIR" --adapter codex --yes > /dev/null 2>&1

ERRORS=0

# --- Structure checks ---

# Check AGENTS.md exists and is non-empty
if [ ! -s "$WORK_DIR/AGENTS.md" ]; then
  echo "FAIL: AGENTS.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

# Check at least one skill directory exists
SKILL_COUNT=$(find "$WORK_DIR/.agents/skills" -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SKILL_COUNT" -eq 0 ]; then
  echo "FAIL: No SKILL.md files in .agents/skills/"
  ERRORS=$((ERRORS + 1))
fi

# Check SKILL.md files have required frontmatter
while IFS= read -r -d '' skill; do
  if ! head -5 "$skill" | grep -q "^name:"; then
    echo "FAIL: $skill missing 'name:' frontmatter"
    ERRORS=$((ERRORS + 1))
  fi
  if ! head -5 "$skill" | grep -q "^description:"; then
    echo "FAIL: $skill missing 'description:' frontmatter"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$WORK_DIR/.agents/skills" -name "SKILL.md" -print0 2>/dev/null)

# Check agent definitions exist in .agents/agents/
if [ -d "$WORK_DIR/.agents/agents" ]; then
  AGENT_COUNT=$(find "$WORK_DIR/.agents/agents" -name "*.md" -not -path "*/memory/*" | wc -l | tr -d ' ')
else
  AGENT_COUNT=0
fi
if [ "$AGENT_COUNT" -eq 0 ]; then
  echo "FAIL: No agent definitions in .agents/agents/"
  ERRORS=$((ERRORS + 1))
fi

# Check .atta/bootstrap/ exists with detection files
if [ ! -d "$WORK_DIR/.atta/bootstrap" ]; then
  echo "FAIL: .atta/bootstrap/ directory missing"
  ERRORS=$((ERRORS + 1))
elif [ ! -f "$WORK_DIR/.atta/bootstrap/generator.md" ]; then
  echo "FAIL: .atta/bootstrap/generator.md missing"
  ERRORS=$((ERRORS + 1))
fi

# Check GETTING-STARTED.md exists
if [ ! -s "$WORK_DIR/GETTING-STARTED.md" ]; then
  echo "FAIL: GETTING-STARTED.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

# Check memory directory exists
if [ ! -f "$WORK_DIR/.agents/agents/memory/directives.md" ]; then
  echo "FAIL: .agents/agents/memory/directives.md missing"
  ERRORS=$((ERRORS + 1))
fi

# --- Content contract checks (adapter hardening) ---

SKILLS_DIR="$WORK_DIR/.agents/skills"

# Check: zero AskUserQuestion in installed skills
AUQ_COUNT=$({ grep -rl "AskUserQuestion" "$SKILLS_DIR" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$AUQ_COUNT" -gt 0 ]; then
  echo "FAIL: $AUQ_COUNT skill files still contain 'AskUserQuestion'"
  { grep -rl "AskUserQuestion" "$SKILLS_DIR" 2>/dev/null || true; } | sed 's|.*/skills/||'
  ERRORS=$((ERRORS + 1))
fi

# Check: zero 'Task tool' in installed skills
TT_COUNT=$({ grep -rl "Task tool" "$SKILLS_DIR" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$TT_COUNT" -gt 0 ]; then
  echo "FAIL: $TT_COUNT skill files still contain 'Task tool'"
  { grep -rl "Task tool" "$SKILLS_DIR" 2>/dev/null || true; } | sed 's|.*/skills/||'
  ERRORS=$((ERRORS + 1))
fi

# Check: zero .claude/agents/ path references (except update which is inherently about .claude/)
CLAUDE_PATH_COUNT=$({ grep -rl "\.claude/agents" "$SKILLS_DIR" 2>/dev/null || true; } | { grep -v "/update/" || true; } | wc -l | tr -d ' ')
if [ "$CLAUDE_PATH_COUNT" -gt 0 ]; then
  echo "FAIL: $CLAUDE_PATH_COUNT skill files (non-update) still reference '.claude/agents'"
  { grep -rl "\.claude/agents" "$SKILLS_DIR" 2>/dev/null || true; } | { grep -v "/update/" || true; } | sed 's|.*/skills/||'
  ERRORS=$((ERRORS + 1))
fi

# Check: AGENTS.md uses $ prefix (not / prefix)
if ! grep -q '\$review\|\$atta\|\$agent' "$WORK_DIR/AGENTS.md"; then
  echo "FAIL: AGENTS.md does not use \$ prefix for commands"
  ERRORS=$((ERRORS + 1))
fi

# Check: .codex/config.toml exists with [agents.*] sections
if [ ! -s "$WORK_DIR/.codex/config.toml" ]; then
  echo "FAIL: .codex/config.toml missing or empty"
  ERRORS=$((ERRORS + 1))
else
  # Validate TOML is parseable and has agent sections
  # Use || to prevent set -e from exiting the script on python3 failure
  if ! python3 - "$WORK_DIR/.codex/config.toml" <<'PYEOF'
import sys
try:
    import tomllib
except ImportError:
    try:
        import tomli as tomllib
    except ImportError:
        print('FAIL: No TOML parser available. Install Python 3.11+ (tomllib) or the "tomli" package.')
        sys.exit(1)

path = sys.argv[1]
try:
    with open(path, 'rb') as f:
        data = tomllib.load(f)
except Exception as e:
    print(f'FAIL: {path} is not valid TOML: {e}')
    sys.exit(1)

if 'agents' not in data:
    print('FAIL: config.toml missing [agents] section')
    sys.exit(1)

agents = data['agents']
if len(agents) == 0:
    print('FAIL: config.toml has no agent definitions')
    sys.exit(1)

# Each agent must have description and config_file
for name, agent in agents.items():
    if 'description' not in agent or not agent['description'].strip():
        print(f'FAIL: agents.{name} missing or empty description')
        sys.exit(1)
    if 'config_file' not in agent or not agent['config_file'].strip():
        print(f'FAIL: agents.{name} missing or empty config_file')
        sys.exit(1)
PYEOF
  then
    ERRORS=$((ERRORS + 1))
  fi
fi

# Check: agent .md files have valid frontmatter (no model: inherit)
while IFS= read -r -d '' agent; do
  if ! head -5 "$agent" | grep -q "^name:"; then
    echo "FAIL: $agent missing 'name:' frontmatter"
    ERRORS=$((ERRORS + 1))
  fi
  if head -5 "$agent" | grep -q "^model: inherit"; then
    echo "FAIL: $agent contains 'model: inherit' (Claude Code-specific)"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$WORK_DIR/.agents/agents" -name "*.md" -not -path "*/memory/*" -print0 2>/dev/null)

if [ $ERRORS -eq 0 ]; then
  echo "PASS: Codex adapter — structure + content correct ($SKILL_COUNT skills, $AGENT_COUNT agents, config.toml, zero Claude-isms)"
  exit 0
else
  echo "FAIL: $ERRORS errors found"
  exit 1
fi
