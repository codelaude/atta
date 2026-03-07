#!/bin/bash
# check-copilot-adapter.sh
# Verifies Copilot adapter produces expected file structure and content correctness

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# Run adapter (non-interactive)
node "$REPO_ROOT/bin/atta.js" init --directory "$WORK_DIR" --adapter copilot --yes > /dev/null 2>&1

ERRORS=0

# --- Structure checks ---

# Check AGENTS.md exists and is non-empty
if [ ! -s "$WORK_DIR/AGENTS.md" ]; then
  echo "FAIL: AGENTS.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

# Check copilot-instructions.md exists
if [ ! -s "$WORK_DIR/.github/copilot-instructions.md" ]; then
  echo "FAIL: .github/copilot-instructions.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

# Check at least one skill directory exists
SKILL_COUNT=$(find "$WORK_DIR/.github/skills" -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SKILL_COUNT" -eq 0 ]; then
  echo "FAIL: No SKILL.md files in .github/skills/"
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
done < <(find "$WORK_DIR/.github/skills" -name "SKILL.md" -print0 2>/dev/null)

# Check agent definitions exist in .github/atta/agents/
if [ -d "$WORK_DIR/.github/atta/agents" ]; then
  AGENT_COUNT=$(find "$WORK_DIR/.github/atta/agents" -name "*.md" -not -path "*/memory/*" | wc -l | tr -d ' ')
else
  AGENT_COUNT=0
fi
if [ "$AGENT_COUNT" -eq 0 ]; then
  echo "FAIL: No agent definitions in .github/atta/agents/"
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
if [ ! -f "$WORK_DIR/.github/atta/agents/memory/directives.md" ]; then
  echo "FAIL: .github/atta/agents/memory/directives.md missing"
  ERRORS=$((ERRORS + 1))
fi

# Check .github/instructions/ files exist
for ifile in atta-skills.instructions.md atta-agents.instructions.md atta-memory.instructions.md; do
  if [ ! -s "$WORK_DIR/.github/instructions/$ifile" ]; then
    echo "FAIL: .github/instructions/$ifile missing or empty"
    ERRORS=$((ERRORS + 1))
  fi
done

# --- Content contract checks (adapter hardening) ---

# Exclude update/SKILL.md from .claude/ checks — it's inherently about .claude/ management
SKILLS_DIR="$WORK_DIR/.github/skills"

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

# Check: zero .claude/agents/ path references in installed skills (except update which is inherently about .claude/)
CLAUDE_PATH_COUNT=$({ grep -rl "\.claude/agents/" "$SKILLS_DIR" 2>/dev/null || true; } | { grep -v "/atta-update/" || true; } | wc -l | tr -d ' ')
if [ "$CLAUDE_PATH_COUNT" -gt 0 ]; then
  echo "FAIL: $CLAUDE_PATH_COUNT skill files (non-update) still reference '.claude/agents/'"
  { grep -rl "\.claude/agents/" "$SKILLS_DIR" 2>/dev/null || true; } | { grep -v "/atta-update/" || true; } | sed 's|.*/skills/||'
  ERRORS=$((ERRORS + 1))
fi

# Check: renamed skills have updated frontmatter
if [ -f "$SKILLS_DIR/atta-review/SKILL.md" ]; then
  if ! head -3 "$SKILLS_DIR/atta-review/SKILL.md" | grep -q "^name: atta-review"; then
    echo "FAIL: atta-review/SKILL.md frontmatter not renamed"
    ERRORS=$((ERRORS + 1))
  fi
fi
if [ -f "$SKILLS_DIR/atta-agent/SKILL.md" ]; then
  if ! head -3 "$SKILLS_DIR/atta-agent/SKILL.md" | grep -q "^name: atta-agent"; then
    echo "FAIL: atta-agent/SKILL.md frontmatter not renamed"
    ERRORS=$((ERRORS + 1))
  fi
fi
if [ -f "$SKILLS_DIR/atta-update/SKILL.md" ]; then
  if ! head -3 "$SKILLS_DIR/atta-update/SKILL.md" | grep -q "^name: atta-update"; then
    echo "FAIL: atta-update/SKILL.md frontmatter not renamed"
    ERRORS=$((ERRORS + 1))
  fi
fi

if [ $ERRORS -eq 0 ]; then
  echo "PASS: Copilot adapter — structure + content correct ($SKILL_COUNT skills, $AGENT_COUNT agents, zero Claude-isms)"
  exit 0
else
  echo "FAIL: $ERRORS errors found"
  exit 1
fi
