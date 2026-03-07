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

if [ $ERRORS -eq 0 ]; then
  echo "PASS: Codex adapter — structure + content correct ($SKILL_COUNT skills, $AGENT_COUNT agents, zero Claude-isms)"
  exit 0
else
  echo "FAIL: $ERRORS errors found"
  exit 1
fi
