#!/bin/bash
# check-gemini-adapter.sh
# Verifies Gemini adapter produces valid TOML commands, agents, bootstrap, and content correctness
# Requires: python3 (3.11+ for tomllib, or tomli fallback)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# Check TOML parser availability
python3 -c "
try:
    import tomllib
except ImportError:
    import tomli as tomllib
" 2>/dev/null || {
  echo "FAIL: No TOML parser available. Requires Python 3.11+ (tomllib) or: pip3 install tomli"
  exit 1
}

# Run adapter (non-interactive)
node "$REPO_ROOT/bin/atta.js" init --directory "$WORK_DIR" --adapter gemini --yes > /dev/null 2>&1

ERRORS=0

# --- Structure checks ---

# Check GEMINI.md exists and is non-empty
if [ ! -s "$WORK_DIR/GEMINI.md" ]; then
  echo "FAIL: GEMINI.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

# Check GETTING-STARTED.md exists
if [ ! -s "$WORK_DIR/GETTING-STARTED.md" ]; then
  echo "FAIL: GETTING-STARTED.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

# Check TOML commands exist, parse correctly, and have required fields
TOML_COUNT=0
if [ -d "$WORK_DIR/.gemini/commands" ]; then
  while IFS= read -r -d '' toml; do
    TOML_COUNT=$((TOML_COUNT + 1))
    # Parse TOML and validate required fields
    python3 - "$toml" <<'PYEOF'
import sys
try:
    import tomllib
except ImportError:
    import tomli as tomllib

path = sys.argv[1]
try:
    with open(path, 'rb') as f:
        data = tomllib.load(f)
except Exception as e:
    print(f'FAIL: {path} is not valid TOML: {e}')
    sys.exit(1)

if 'description' not in data:
    print(f'FAIL: {path} missing description field')
    sys.exit(1)
if 'prompt' not in data:
    print(f'FAIL: {path} missing prompt field')
    sys.exit(1)
if not isinstance(data['description'], str) or not data['description'].strip():
    print(f'FAIL: {path} description is missing or blank')
    sys.exit(1)
if not isinstance(data['prompt'], str) or not data['prompt'].strip():
    print(f'FAIL: {path} prompt is missing or blank')
    sys.exit(1)
PYEOF
    [ $? -eq 0 ] || {
      echo "FAIL: TOML parse/validation failed for $toml"
      ERRORS=$((ERRORS + 1))
    }
  done < <(find "$WORK_DIR/.gemini/commands" -name "*.toml" -print0 2>/dev/null)
fi

if [ "$TOML_COUNT" -eq 0 ]; then
  echo "FAIL: No TOML commands generated in .gemini/commands/"
  ERRORS=$((ERRORS + 1))
fi

# --- Skill flag handling in TOML (Track E) ---
# TOML commands should NOT contain raw CC frontmatter fields
while IFS= read -r -d '' toml; do
  if grep -q "disable-model-invocation" "$toml"; then
    # Should be embedded as natural language, not the raw field name
    if grep -q "^disable-model-invocation:" "$toml"; then
      echo "FAIL: $toml contains raw 'disable-model-invocation:' field (should be NL instruction)"
      ERRORS=$((ERRORS + 1))
    fi
  fi
  if grep -q "^allowed-tools:" "$toml"; then
    echo "FAIL: $toml contains raw 'allowed-tools:' field (not a TOML field)"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$WORK_DIR/.gemini/commands" -name "*.toml" -print0 2>/dev/null)

# Check that action skill TOML commands have NL instruction for disable-model-invocation
# Derived from source SKILL.md frontmatter — not hardcoded, so new flagged skills are caught.
CLAUDE_SKILLS_DIR="$(cd "$SCRIPT_DIR/../.claude/skills" 2>/dev/null && pwd)"
if [ -d "$CLAUDE_SKILLS_DIR" ]; then
  while IFS= read -r -d '' src_skill; do
    SKILL_DIR_NAME="$(basename "$(dirname "$src_skill")")"
    if head -10 "$src_skill" | grep -q "^disable-model-invocation: true"; then
      TOML_FILE="$WORK_DIR/.gemini/commands/${SKILL_DIR_NAME}.toml"
      if [ -f "$TOML_FILE" ]; then
        if ! grep -q "Execute these instructions directly" "$TOML_FILE"; then
          echo "FAIL: $TOML_FILE missing disable-model-invocation NL instruction"
          ERRORS=$((ERRORS + 1))
        fi
      fi
    fi
  done < <(find "$CLAUDE_SKILLS_DIR" -name "SKILL.md" -print0 2>/dev/null)
fi

# Check agent definitions exist in .gemini/agents/
if [ -d "$WORK_DIR/.gemini/agents" ]; then
  AGENT_COUNT=$(find "$WORK_DIR/.gemini/agents" -name "*.md" -not -path "*/memory/*" | wc -l | tr -d ' ')
else
  AGENT_COUNT=0
fi
if [ "$AGENT_COUNT" -eq 0 ]; then
  echo "FAIL: No agent definitions in .gemini/agents/"
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
if [ ! -f "$WORK_DIR/.gemini/agents/memory/directives.md" ]; then
  echo "FAIL: .gemini/agents/memory/directives.md missing"
  ERRORS=$((ERRORS + 1))
fi

# Check review guidance files exist
if [ ! -s "$WORK_DIR/.gemini/styleguide.md" ]; then
  echo "FAIL: .gemini/styleguide.md missing or empty"
  ERRORS=$((ERRORS + 1))
else
  if ! grep -q "## Always Check" "$WORK_DIR/.gemini/styleguide.md"; then
    echo "FAIL: styleguide.md missing '## Always Check' section"
    ERRORS=$((ERRORS + 1))
  fi
fi

if [ ! -s "$WORK_DIR/.gemini/config.yaml" ]; then
  echo "FAIL: .gemini/config.yaml missing or empty"
  ERRORS=$((ERRORS + 1))
else
  if ! grep -q "comment_severity_threshold" "$WORK_DIR/.gemini/config.yaml"; then
    echo "FAIL: config.yaml missing comment_severity_threshold"
    ERRORS=$((ERRORS + 1))
  fi
fi

# --- Content contract checks (adapter hardening) ---

COMMANDS_DIR="$WORK_DIR/.gemini/commands"

# Check: zero AskUserQuestion in TOML commands
AUQ_COUNT=$({ grep -rl "AskUserQuestion" "$COMMANDS_DIR" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$AUQ_COUNT" -gt 0 ]; then
  echo "FAIL: $AUQ_COUNT command files still contain 'AskUserQuestion'"
  { grep -rl "AskUserQuestion" "$COMMANDS_DIR" 2>/dev/null || true; } | sed 's|.*/commands/||'
  ERRORS=$((ERRORS + 1))
fi

# Check: zero 'Task tool' in TOML commands
TT_COUNT=$({ grep -rl "Task tool" "$COMMANDS_DIR" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$TT_COUNT" -gt 0 ]; then
  echo "FAIL: $TT_COUNT command files still contain 'Task tool'"
  { grep -rl "Task tool" "$COMMANDS_DIR" 2>/dev/null || true; } | sed 's|.*/commands/||'
  ERRORS=$((ERRORS + 1))
fi

# Check: zero .claude/agents/ path references (except update.toml which is inherently about .claude/)
CLAUDE_PATH_COUNT=$({ grep -rl "\.claude/agents" "$COMMANDS_DIR" 2>/dev/null || true; } | { grep -v "update.toml" || true; } | wc -l | tr -d ' ')
if [ "$CLAUDE_PATH_COUNT" -gt 0 ]; then
  echo "FAIL: $CLAUDE_PATH_COUNT command files (non-update) still reference '.claude/agents'"
  { grep -rl "\.claude/agents" "$COMMANDS_DIR" 2>/dev/null || true; } | { grep -v "update.toml" || true; } | sed 's|.*/commands/||'
  ERRORS=$((ERRORS + 1))
fi

# Check: zero unresolved {attaDir} placeholders in TOML commands
PLACEHOLDER_COUNT=$({ grep -rl "{attaDir}\|{agentsDir}\|{bootstrapDir}\|{knowledgeDir}\|{metadataDir}\|{teamDir}\|{localDir}" "$COMMANDS_DIR" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$PLACEHOLDER_COUNT" -gt 0 ]; then
  echo "FAIL: $PLACEHOLDER_COUNT command files still contain unresolved placeholders"
  { grep -rl "{attaDir}\|{agentsDir}\|{bootstrapDir}\|{knowledgeDir}\|{metadataDir}\|{teamDir}\|{localDir}" "$COMMANDS_DIR" 2>/dev/null || true; } | sed 's|.*/commands/||'
  ERRORS=$((ERRORS + 1))
fi

# Check: agent files have valid frontmatter (name + description, no model: inherit)
AGENTS_DIR="$WORK_DIR/.gemini/agents"
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
done < <(find "$AGENTS_DIR" -name "*.md" -not -path "*/memory/*" -print0 2>/dev/null)

# Check: zero unresolved {attaDir} placeholders in agent files
AGENT_PLACEHOLDER_COUNT=$({ grep -rl "{attaDir}\|{agentsDir}\|{bootstrapDir}\|{knowledgeDir}\|{metadataDir}\|{teamDir}\|{localDir}" "$AGENTS_DIR" 2>/dev/null || true; } | { grep -v "/memory/" || true; } | wc -l | tr -d ' ')
if [ "$AGENT_PLACEHOLDER_COUNT" -gt 0 ]; then
  echo "FAIL: $AGENT_PLACEHOLDER_COUNT agent files still contain unresolved placeholders"
  { grep -rl "{attaDir}\|{agentsDir}\|{bootstrapDir}\|{knowledgeDir}\|{metadataDir}\|{teamDir}\|{localDir}" "$AGENTS_DIR" 2>/dev/null || true; } | { grep -v "/memory/" || true; } | sed 's|.*/agents/||'
  ERRORS=$((ERRORS + 1))
fi

# --- Hooks checks (v2.7.1 Track C) ---

# Check hooks.json exists and is valid JSON with Gemini event names
if [ ! -f "$WORK_DIR/.gemini/hooks.json" ]; then
  echo "FAIL: .gemini/hooks.json missing"
  ERRORS=$((ERRORS + 1))
else
  python3 - "$WORK_DIR/.gemini/hooks.json" <<'PYEOF' 2>/dev/null || ERRORS=$((ERRORS + 1))
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
if 'hooks' not in data:
    print('FAIL: hooks.json missing top-level "hooks" key')
    sys.exit(1)
# Enforcement hooks: BeforeTool (pre-bash safety)
for event in ['BeforeTool']:
    if event not in data['hooks']:
        print(f'FAIL: hooks.json missing Gemini event: {event}')
        sys.exit(1)
PYEOF
fi

# Check hook scripts exist and are executable (referenced by hooks.json)
for script in pre-bash-safety.sh stop-quality-gate.sh model-gate.sh; do
  if [ ! -x "$WORK_DIR/.atta/scripts/hooks/$script" ]; then
    echo "FAIL: .atta/scripts/hooks/$script missing or not executable"
    ERRORS=$((ERRORS + 1))
  fi
done

# --- Agent frontmatter checks ---

# Check that code-reviewer agent has Gemini-native tools and max_turns
REVIEWER_AGENT=$(find "$WORK_DIR/.gemini/agents" -name "code-reviewer*" -type f 2>/dev/null | head -1)
if [ -n "$REVIEWER_AGENT" ]; then
  if grep -q '^tools:' "$REVIEWER_AGENT"; then
    # Verify Gemini tool names (read_file, grep_search — not Claude Code names)
    if grep -q 'read_file' "$REVIEWER_AGENT" && grep -q 'grep_search' "$REVIEWER_AGENT"; then
      echo "PASS: code-reviewer agent has Gemini-native tools: frontmatter"
    else
      echo "FAIL: code-reviewer tools: present but uses wrong tool names (expected read_file, grep_search)"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo "FAIL: code-reviewer agent missing tools: frontmatter"
    ERRORS=$((ERRORS + 1))
  fi
  # Check max_turns (Gemini uses snake_case, not camelCase)
  if grep -q '^max_turns:' "$REVIEWER_AGENT"; then
    echo "PASS: code-reviewer agent has max_turns: (Gemini snake_case)"
  else
    echo "FAIL: code-reviewer agent missing max_turns: (or using camelCase maxTurns)"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "FAIL: code-reviewer agent file not found in .gemini/agents/"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
  echo "PASS: Gemini adapter — structure + content correct ($TOML_COUNT TOML commands, $AGENT_COUNT agents, zero Claude-isms)"
  exit 0
else
  echo "FAIL: $ERRORS errors found"
  exit 1
fi
