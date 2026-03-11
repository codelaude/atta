#!/bin/bash
# check-cursor-adapter.sh
# Verifies Cursor adapter produces expected file structure and content correctness

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# Run adapter (non-interactive)
node "$REPO_ROOT/bin/atta.js" init --directory "$WORK_DIR" --adapter cursor --yes > /dev/null 2>&1

ERRORS=0

# --- Structure checks ---

# Check AGENTS.md exists and is non-empty
if [ ! -s "$WORK_DIR/AGENTS.md" ]; then
  echo "FAIL: AGENTS.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

# Check GETTING-STARTED.md exists
if [ ! -s "$WORK_DIR/GETTING-STARTED.md" ]; then
  echo "FAIL: GETTING-STARTED.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

# Check .mdc rule files exist
MDC_COUNT=$(find "$WORK_DIR/.cursor/rules" -name "*.mdc" 2>/dev/null | wc -l | tr -d ' ' || echo 0)
if [ "$MDC_COUNT" -eq 0 ]; then
  echo "FAIL: No .mdc files in .cursor/rules/"
  ERRORS=$((ERRORS + 1))
fi

# Check atta.mdc exists and has alwaysApply: true
if [ ! -s "$WORK_DIR/.cursor/rules/atta.mdc" ]; then
  echo "FAIL: .cursor/rules/atta.mdc missing or empty"
  ERRORS=$((ERRORS + 1))
elif ! grep -q "^alwaysApply: true" "$WORK_DIR/.cursor/rules/atta.mdc"; then
  echo "FAIL: atta.mdc does not have alwaysApply: true"
  ERRORS=$((ERRORS + 1))
fi

# Check .mdc files have valid frontmatter with globs: []
while IFS= read -r -d '' mdc; do
  if ! head -5 "$mdc" | grep -q "^description:"; then
    echo "FAIL: $mdc missing 'description:' frontmatter"
    ERRORS=$((ERRORS + 1))
  fi
  if ! head -5 "$mdc" | grep -q "^globs: \[\]"; then
    echo "FAIL: $mdc has invalid globs format (expected 'globs: []')"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$WORK_DIR/.cursor/rules" -name "*.mdc" -print0 2>/dev/null)

# Check agent definitions exist in .cursor/agents/
if [ -d "$WORK_DIR/.cursor/agents" ]; then
  AGENT_COUNT=$(find "$WORK_DIR/.cursor/agents" -name "*.md" -not -path "*/memory/*" | wc -l | tr -d ' ')
else
  AGENT_COUNT=0
fi
if [ "$AGENT_COUNT" -eq 0 ]; then
  echo "FAIL: No agent definitions in .cursor/agents/"
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

# Check memory directory exists
if [ ! -f "$WORK_DIR/.cursor/agents/memory/directives.md" ]; then
  echo "FAIL: .cursor/agents/memory/directives.md missing"
  ERRORS=$((ERRORS + 1))
fi

# --- Content contract checks (adapter hardening) ---

RULES_DIR="$WORK_DIR/.cursor/rules"

# Check: zero AskUserQuestion in installed rules
AUQ_COUNT=$({ grep -rl "AskUserQuestion" "$RULES_DIR" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$AUQ_COUNT" -gt 0 ]; then
  echo "FAIL: $AUQ_COUNT rule files still contain 'AskUserQuestion'"
  { grep -rl "AskUserQuestion" "$RULES_DIR" 2>/dev/null || true; } | sed 's|.*/rules/||'
  ERRORS=$((ERRORS + 1))
fi

# Check: zero 'Task tool' in installed rules
TT_COUNT=$({ grep -rl "Task tool" "$RULES_DIR" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$TT_COUNT" -gt 0 ]; then
  echo "FAIL: $TT_COUNT rule files still contain 'Task tool'"
  { grep -rl "Task tool" "$RULES_DIR" 2>/dev/null || true; } | sed 's|.*/rules/||'
  ERRORS=$((ERRORS + 1))
fi

# Check: zero .claude/agents/ path references (except atta-update which is inherently about .claude/)
CLAUDE_PATH_COUNT=$({ grep -rl "\.claude/agents" "$RULES_DIR" 2>/dev/null || true; } | { grep -v "atta-update" || true; } | wc -l | tr -d ' ')
if [ "$CLAUDE_PATH_COUNT" -gt 0 ]; then
  echo "FAIL: $CLAUDE_PATH_COUNT rule files (non-update) still reference '.claude/agents'"
  { grep -rl "\.claude/agents" "$RULES_DIR" 2>/dev/null || true; } | { grep -v "atta-update" || true; } | sed 's|.*/rules/||'
  ERRORS=$((ERRORS + 1))
fi

# Check: AGENTS.md uses @atta- prefix
if ! grep -q '@atta-review\|@atta-agent\|@atta-atta' "$WORK_DIR/AGENTS.md"; then
  echo "FAIL: AGENTS.md does not use @atta- prefix for commands"
  ERRORS=$((ERRORS + 1))
fi

# Check: agent files have valid frontmatter (name + description, no model: inherit)
while IFS= read -r -d '' agent; do
  if ! head -5 "$agent" | grep -q "^name:"; then
    echo "FAIL: $agent missing 'name:' frontmatter"
    ERRORS=$((ERRORS + 1))
  fi
  if ! head -5 "$agent" | grep -q "^description:"; then
    echo "FAIL: $agent missing 'description:' frontmatter"
    ERRORS=$((ERRORS + 1))
  fi
  if head -5 "$agent" | grep -q "^model: inherit"; then
    echo "FAIL: $agent contains 'model: inherit' (Claude Code-specific)"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$WORK_DIR/.cursor/agents" -name "*.md" -not -path "*/memory/*" -print0 2>/dev/null)

if [ $ERRORS -eq 0 ]; then
  echo "PASS: Cursor adapter — structure + content correct ($MDC_COUNT rules, $AGENT_COUNT agents, zero Claude-isms)"
  exit 0
else
  echo "FAIL: $ERRORS errors found"
  exit 1
fi
