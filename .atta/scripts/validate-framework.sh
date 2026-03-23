#!/usr/bin/env bash

# Framework Validation Script
# Usage:
#   bash .atta/scripts/validate-framework.sh
#   bash .atta/scripts/validate-framework.sh --skip-diff-check

set -euo pipefail

SKIP_DIFF_CHECK=false
if [ "${1:-}" = "--skip-diff-check" ]; then
  SKIP_DIFF_CHECK=true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

assert_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: Missing required command: $1" >&2
    exit 1
  fi
}

HAS_RG=false
if command -v rg >/dev/null 2>&1; then
  HAS_RG=true
fi

search_fixed() {
  local file="$1"
  local text="$2"
  if [ "$HAS_RG" = true ]; then
    rg -n --fixed-strings -- "$text" "$file"
  else
    grep -Fn -- "$text" "$file"
  fi
}

assert_contains() {
  local file="$1"
  local text="$2"
  local label="$3"
  if search_fixed "$file" "$text" >/dev/null 2>&1; then
    echo "PASS: $label"
  else
    echo "FAIL: $label" >&2
    echo "  Missing text in $file: $text" >&2
    exit 1
  fi
}

assert_not_contains() {
  local file="$1"
  local text="$2"
  local label="$3"
  if search_fixed "$file" "$text" >/dev/null 2>&1; then
    echo "FAIL: $label" >&2
    echo "  Found forbidden text in $file: $text" >&2
    exit 1
  else
    echo "PASS: $label"
  fi
}

echo "==> Validating prerequisites"
assert_cmd git
if [ "$HAS_RG" = true ]; then
  echo "INFO: Using rg for fixed-string checks"
else
  echo "WARN: rg not found, using grep -F fallback for fixed-string checks"
fi

HAS_RUBY=false
if command -v ruby >/dev/null 2>&1; then
  HAS_RUBY=true
fi

echo "==> Validating YAML syntax"
yaml_files=(
  ".atta/bootstrap/detection/frontend-detectors.yaml"
  ".atta/bootstrap/detection/backend-detectors.yaml"
  ".atta/bootstrap/detection/database-detectors.yaml"
  ".atta/bootstrap/detection/tool-detectors.yaml"
  ".atta/bootstrap/detection/security-tools.yaml"
  ".atta/bootstrap/detection/architectural-detectors.yaml"
  ".atta/bootstrap/mappings/agent-mappings.yaml"
  ".atta/bootstrap/mappings/mcp-mappings.yaml"
  ".atta/bootstrap/mappings/skill-mappings.yaml"
)
if [ "$HAS_RUBY" = true ]; then
  ruby -ryaml -e 'ARGV.each { |f| YAML.load_file(f); puts "PASS: YAML " + f }' "${yaml_files[@]}"
elif command -v python3 >/dev/null 2>&1 && python3 -c "import yaml" 2>/dev/null; then
  python3 -c "
import yaml, sys
for f in sys.argv[1:]:
    with open(f) as fh:
        yaml.safe_load(fh)
    print('PASS: YAML ' + f)
" "${yaml_files[@]}"
else
  echo "WARN: Neither ruby nor python3+PyYAML available — skipping YAML validation"
fi

echo "==> Running targeted security/coherence checks"
assert_contains ".atta/scripts/session-cleanup.sh" "-print0" "session-cleanup uses null-delimited find output"
assert_contains ".atta/scripts/session-cleanup.sh" "xargs -0 rm -f" "session-cleanup uses xargs -0 deletion"

assert_contains ".claude/skills/atta/SKILL.md" "#### Security Tools (cross-cutting)" "atta skill documents security tool detection"
assert_contains ".claude/skills/atta/SKILL.md" "security-specialist (if triggered)" "atta skill documents security specialist activation"

strict_password_pattern="password\\s*=\\s*\"[^\"]+\"|password\\s*=\\s*'[^']+'"
weak_password_pattern="password\\s*=\\s*['\"][^'\"]+['\"]"
assert_contains ".claude/skills/atta-security-audit/SKILL.md" "$strict_password_pattern" "security-audit uses strict password regex"
assert_not_contains ".claude/skills/atta-security-audit/SKILL.md" "$weak_password_pattern" "security-audit does not use weak password regex"
assert_contains ".atta/bootstrap/templates/agents/security-specialist.template.md" "$strict_password_pattern" "security specialist template uses strict password regex"
assert_not_contains ".atta/bootstrap/templates/agents/security-specialist.template.md" "$weak_password_pattern" "security specialist template does not use weak password regex"

echo "==> Validating pattern detection system"
assert_contains ".atta/scripts/pattern-log.sh" "corrections.jsonl" "pattern-log.sh targets corrections.jsonl"
assert_contains ".atta/scripts/pattern-log.sh" "json.dumps" "pattern-log.sh uses safe JSON serialization"
assert_contains ".atta/scripts/pattern-analyze.sh" "patterns-learned.json" "pattern-analyze.sh targets patterns-learned.json"
assert_contains ".claude/skills/atta-patterns/SKILL.md" "log" "patterns skill has log subcommand"
assert_contains ".claude/skills/atta-patterns/SKILL.md" "learn" "patterns skill has learn subcommand"
assert_contains ".claude/skills/atta-patterns/SKILL.md" "suggest" "patterns skill has suggest subcommand"
assert_contains ".claude/skills/atta-patterns/SKILL.md" "promote" "patterns skill has promote subcommand"
assert_contains ".claude/skills/atta-patterns/SKILL.md" "status" "patterns skill has status subcommand"
assert_contains ".atta/team/templates/correction-event.md" "corrections.jsonl" "correction-event schema references corrections.jsonl"
assert_contains ".claude/agents/librarian.md" "Correction Capture Protocol" "librarian has Correction Capture Protocol"
assert_contains ".claude/skills/atta-review/SKILL.md" "pattern-log.sh" "review skill integrates pattern logging"
assert_contains ".claude/skills/atta-collaborate/SKILL.md" "pattern-log.sh" "collaborate skill integrates pattern logging"

echo "==> Validating agent adaptation system (Track 6)"
assert_contains ".atta/team/templates/correction-event.md" "outcome" "correction-event schema has outcome field"
assert_contains ".atta/team/templates/correction-event.md" "agentId" "correction-event schema has agentId field"
assert_contains ".atta/scripts/pattern-log.sh" "outcome" "pattern-log.sh accepts outcome field"
assert_contains ".atta/scripts/pattern-log.sh" "agentId" "pattern-log.sh accepts agentId field"
assert_contains ".atta/scripts/pattern-analyze.sh" "agent-learning.json" "pattern-analyze.sh generates agent-learning.json"
assert_contains ".atta/scripts/pattern-analyze.sh" "agent_groups" "pattern-analyze.sh groups by agent"
assert_contains ".claude/skills/atta-patterns/SKILL.md" "Agent Subcommand" "patterns skill has agent subcommand"
assert_contains ".claude/skills/atta-agent/SKILL.md" "agent-learning.json" "agent skill reads learning profile"
assert_contains ".claude/skills/atta-agent/SKILL.md" "Learning Profile" "agent skill injects learning profile"
assert_contains ".claude/skills/atta-collaborate/SKILL.md" "agent-learning.json" "collaborate skill reads learning profiles"
assert_contains ".claude/agents/librarian.md" "agentId" "librarian captures agentId in corrections"
assert_contains ".claude/skills/atta-review/SKILL.md" "agentId" "review skill passes agentId"
assert_contains ".claude/skills/atta-collaborate/SKILL.md" "agentId" "collaborate skill passes agentId"

echo "==> Validating learning dashboard (Track 7)"
assert_contains ".claude/skills/atta-patterns/SKILL.md" "Dashboard Subcommand" "patterns skill has dashboard subcommand"
assert_contains ".claude/skills/atta-patterns/SKILL.md" "Correction Velocity" "dashboard shows velocity trends"
assert_contains ".claude/skills/atta-patterns/SKILL.md" "Agent Trends" "dashboard shows agent trends"
assert_contains ".claude/skills/atta-patterns/SKILL.md" "Aging Patterns" "dashboard shows aging patterns"
assert_contains ".claude/skills/atta-patterns/SKILL.md" "Recommendations" "dashboard shows recommendations"
assert_contains ".claude/skills/atta-patterns/SKILL.md" "Quick Trends" "status subcommand has quick trends teaser"
assert_contains ".atta/scripts/pattern-analyze.sh" "trends_data" "pattern-analyze.sh computes trend data"
assert_contains ".atta/scripts/pattern-analyze.sh" "recommendations" "pattern-analyze.sh generates recommendations"
assert_contains ".atta/scripts/pattern-analyze.sh" "velocity" "pattern-analyze.sh computes velocity"
assert_contains ".atta/scripts/pattern-analyze.sh" "aging" "pattern-analyze.sh detects aging patterns"
assert_contains ".atta/team/templates/correction-event.md" "v1.1.0" "correction-event schema documents v1.1.0"

echo "==> Checking git diff integrity"
if [ "$SKIP_DIFF_CHECK" = false ]; then
  git diff --check
  echo "PASS: git diff --check"
else
  echo "SKIP: git diff --check"
fi

echo "==> Framework validation passed"
