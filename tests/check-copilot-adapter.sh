#!/bin/bash
# check-copilot-adapter.sh
# Verifies Copilot adapter produces expected file structure

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Run adapter (non-interactive)
node "$REPO_ROOT/bin/atta.js" init --directory "$TMPDIR" --adapter copilot --yes > /dev/null 2>&1

ERRORS=0

# Check AGENTS.md exists and is non-empty
if [ ! -s "$TMPDIR/AGENTS.md" ]; then
  echo "FAIL: AGENTS.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

# Check copilot-instructions.md exists
if [ ! -s "$TMPDIR/.github/copilot-instructions.md" ]; then
  echo "FAIL: .github/copilot-instructions.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

# Check at least one skill directory exists
SKILL_COUNT=$(find "$TMPDIR/.github/skills" -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
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
done < <(find "$TMPDIR/.github/skills" -name "SKILL.md" -print0 2>/dev/null)

# Check GETTING-STARTED.md exists
if [ ! -s "$TMPDIR/GETTING-STARTED.md" ]; then
  echo "FAIL: GETTING-STARTED.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
  echo "PASS: Copilot adapter output structure correct ($SKILL_COUNT skills)"
  exit 0
else
  echo "FAIL: $ERRORS errors found"
  exit 1
fi
