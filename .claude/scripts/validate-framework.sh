#!/usr/bin/env bash

# Framework Validation Script
# Usage:
#   bash .claude/scripts/validate-framework.sh
#   bash .claude/scripts/validate-framework.sh --skip-diff-check

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
assert_cmd ruby
assert_cmd git
if [ "$HAS_RG" = true ]; then
  echo "INFO: Using rg for fixed-string checks"
else
  echo "WARN: rg not found, using grep -F fallback for fixed-string checks"
fi

echo "==> Validating YAML syntax"
yaml_files=(
  ".claude/bootstrap/detection/frontend-detectors.yaml"
  ".claude/bootstrap/detection/backend-detectors.yaml"
  ".claude/bootstrap/detection/database-detectors.yaml"
  ".claude/bootstrap/detection/tool-detectors.yaml"
  ".claude/bootstrap/detection/security-tools.yaml"
  ".claude/bootstrap/mappings/agent-mappings.yaml"
  ".claude/bootstrap/mappings/mcp-mappings.yaml"
  ".claude/bootstrap/mappings/skill-mappings.yaml"
)
ruby -ryaml -e 'ARGV.each { |f| YAML.load_file(f); puts "PASS: YAML " + f }' "${yaml_files[@]}"

echo "==> Running targeted security/coherence checks"
assert_contains ".claude/scripts/session-cleanup.sh" "-print0" "session-cleanup uses null-delimited find output"
assert_contains ".claude/scripts/session-cleanup.sh" "xargs -0 rm -f" "session-cleanup uses xargs -0 deletion"

assert_contains ".claude/skills/atta/SKILL.md" "#### Security Tools (cross-cutting)" "atta skill documents security tool detection"
assert_contains ".claude/skills/atta/SKILL.md" "security-specialist (if triggered)" "atta skill documents security specialist activation"

strict_password_pattern="password\\s*=\\s*\"[^\"]+\"|password\\s*=\\s*'[^']+'"
weak_password_pattern="password\\s*=\\s*['\"][^'\"]+['\"]"
assert_contains ".claude/skills/security-audit/SKILL.md" "$strict_password_pattern" "security-audit uses strict password regex"
assert_not_contains ".claude/skills/security-audit/SKILL.md" "$weak_password_pattern" "security-audit does not use weak password regex"
assert_contains ".claude/bootstrap/templates/agents/security-specialist.template.md" "$strict_password_pattern" "security specialist template uses strict password regex"
assert_not_contains ".claude/bootstrap/templates/agents/security-specialist.template.md" "$weak_password_pattern" "security specialist template does not use weak password regex"

echo "==> Validating pattern detection system"
assert_contains ".claude/scripts/pattern-log.sh" "corrections.jsonl" "pattern-log.sh targets corrections.jsonl"
assert_contains ".claude/scripts/pattern-log.sh" "json.dumps" "pattern-log.sh uses safe JSON serialization"
assert_contains ".claude/scripts/pattern-analyze.sh" "patterns-learned.json" "pattern-analyze.sh targets patterns-learned.json"
assert_contains ".claude/skills/patterns/SKILL.md" "log" "patterns skill has log subcommand"
assert_contains ".claude/skills/patterns/SKILL.md" "learn" "patterns skill has learn subcommand"
assert_contains ".claude/skills/patterns/SKILL.md" "suggest" "patterns skill has suggest subcommand"
assert_contains ".claude/skills/patterns/SKILL.md" "promote" "patterns skill has promote subcommand"
assert_contains ".claude/skills/patterns/SKILL.md" "status" "patterns skill has status subcommand"
assert_contains ".claude/knowledge/templates/correction-event.md" "corrections.jsonl" "correction-event schema references corrections.jsonl"
assert_contains ".claude/agents/librarian.md" "Correction Capture Protocol" "librarian has Correction Capture Protocol"
assert_contains ".claude/skills/review/SKILL.md" "pattern-log.sh" "review skill integrates pattern logging"
assert_contains ".claude/skills/collaborate/SKILL.md" "pattern-log.sh" "collaborate skill integrates pattern logging"

echo "==> Checking git diff integrity"
if [ "$SKIP_DIFF_CHECK" = false ]; then
  git diff --check
  echo "PASS: git diff --check"
else
  echo "SKIP: git diff --check"
fi

echo "==> Framework validation passed"
