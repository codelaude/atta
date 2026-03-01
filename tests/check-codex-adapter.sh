#!/bin/bash
# check-codex-adapter.sh
# Verifies Codex adapter produces expected file structure

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Run adapter (non-interactive)
node "$REPO_ROOT/bin/atta.js" init --directory "$TMPDIR" --adapter codex --yes > /dev/null 2>&1

ERRORS=0

# Check AGENTS.md exists and is non-empty
if [ ! -s "$TMPDIR/AGENTS.md" ]; then
  echo "FAIL: AGENTS.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

# Check at least one skill directory exists
SKILL_COUNT=$(find "$TMPDIR/.agents/skills" -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
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
done < <(find "$TMPDIR/.agents/skills" -name "SKILL.md" -print0 2>/dev/null)

# Check agent definitions exist in .agents/agents/
AGENT_COUNT=$(find "$TMPDIR/.agents/agents" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$AGENT_COUNT" -eq 0 ]; then
  echo "FAIL: No agent definitions in .agents/agents/"
  ERRORS=$((ERRORS + 1))
fi

# Check .atta/bootstrap/ exists with detection files
if [ ! -d "$TMPDIR/.atta/bootstrap" ]; then
  echo "FAIL: .atta/bootstrap/ directory missing"
  ERRORS=$((ERRORS + 1))
elif [ ! -f "$TMPDIR/.atta/bootstrap/generator.md" ]; then
  echo "FAIL: .atta/bootstrap/generator.md missing"
  ERRORS=$((ERRORS + 1))
fi

# Check GETTING-STARTED.md exists
if [ ! -s "$TMPDIR/GETTING-STARTED.md" ]; then
  echo "FAIL: GETTING-STARTED.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
  echo "PASS: Codex adapter output structure correct ($SKILL_COUNT skills, $AGENT_COUNT agents)"
  exit 0
else
  echo "FAIL: $ERRORS errors found"
  exit 1
fi
