#!/bin/bash
# check-hook-scripts.sh
# Verifies model-gate.sh and pre-bash-safety.sh hook scripts behave correctly.
# Extracts scripts from shared.js constants and tests exit codes + stdout.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

ERRORS=0

# ─── Extract hook scripts from shared.js ─────────────────────────────
# Uses node to import the constants and write them to temp files
node --input-type=module <<JSEOF
import { MODEL_GATE_SCRIPT, PRE_BASH_SAFETY_SCRIPT, STOP_QUALITY_GATE_SCRIPT } from '$REPO_ROOT/src/adapters/shared.js';
import { writeFileSync } from 'node:fs';
writeFileSync('$WORK_DIR/model-gate.sh', MODEL_GATE_SCRIPT, { mode: 0o755 });
writeFileSync('$WORK_DIR/pre-bash-safety.sh', PRE_BASH_SAFETY_SCRIPT, { mode: 0o755 });
writeFileSync('$WORK_DIR/stop-quality-gate.sh', STOP_QUALITY_GATE_SCRIPT, { mode: 0o755 });
JSEOF

# Create a minimal model-registry.json for model-gate tests
mkdir -p "$WORK_DIR/.atta/team"
cat > "$WORK_DIR/.atta/team/model-registry.json" <<'REGEOF'
{
  "tiers": {
    "light": { "claude-code": "haiku", "copilot": "Claude Haiku 4.5", "cursor": "haiku", "gemini": "flash" },
    "mid":   { "claude-code": "sonnet", "copilot": "Claude Sonnet 4.6", "cursor": "sonnet", "gemini": "gemini-pro" },
    "full":  { "claude-code": "opus", "copilot": "Claude Opus 4.6", "cursor": "opus", "gemini": "gemini-ultra" }
  },
  "skills": {
    "atta-lint": "light",
    "atta-review": "mid",
    "atta-security-audit": "full"
  }
}
REGEOF

# ─── Test helpers ─────────────────────────────────────────────────────

run_hook() {
  # Usage: run_hook <script> <stdin_json> [env_vars...]
  # Returns: sets HOOK_EXIT, HOOK_STDOUT, and HOOK_STDERR
  local script="$1"
  local input="$2"
  shift 2

  local tmp_stderr
  tmp_stderr=$(mktemp)

  set +e
  HOOK_STDOUT=$(cd "$WORK_DIR" && env "$@" bash "$WORK_DIR/$script" <<< "$input" 2>"$tmp_stderr")
  HOOK_EXIT=$?
  set -e

  HOOK_STDERR=$(cat "$tmp_stderr")
  rm -f "$tmp_stderr"
}

assert_exit() {
  local name="$1"
  local expected="$2"
  if [ "$HOOK_EXIT" -eq "$expected" ]; then
    echo "PASS: $name"
  else
    echo "FAIL: $name — expected exit $expected, got $HOOK_EXIT"
    ERRORS=$((ERRORS + 1))
  fi
}

assert_exit_and_deny() {
  local name="$1"
  local expected_exit="$2"
  if [ "$HOOK_EXIT" -ne "$expected_exit" ]; then
    echo "FAIL: $name — expected exit $expected_exit, got $HOOK_EXIT"
    ERRORS=$((ERRORS + 1))
    return
  fi
  if echo "$HOOK_STDOUT" | grep -q '"deny"'; then
    echo "PASS: $name"
  else
    echo "FAIL: $name — expected deny in stdout, got: $HOOK_STDOUT"
    ERRORS=$((ERRORS + 1))
  fi
}

# ─── Model Gate Tests ─────────────────────────────────────────────────

echo "=== Model Gate Tests ==="

# Test 1: No registry file → exit 0
mv "$WORK_DIR/.atta/team/model-registry.json" "$WORK_DIR/.atta/team/model-registry.json.bak"
run_hook "model-gate.sh" '{"tool_input":{"skill":"atta-lint"}}' "ATTA_ADAPTER=copilot" "COPILOT_MODEL=Claude Opus 4.6"
mv "$WORK_DIR/.atta/team/model-registry.json.bak" "$WORK_DIR/.atta/team/model-registry.json"
assert_exit "model-gate: no registry file → exit 0" 0

# Test 2: Unknown skill → exit 0
run_hook "model-gate.sh" '{"tool_input":{"skill":"unknown-skill"}}' "ATTA_ADAPTER=copilot" "COPILOT_MODEL=Claude Opus 4.6"
assert_exit "model-gate: unknown skill → exit 0" 0

# Test 3: ATTA_MODEL_GATE=off → exit 0
run_hook "model-gate.sh" '{"tool_input":{"skill":"atta-lint"}}' "ATTA_MODEL_GATE=off" "ATTA_ADAPTER=copilot" "COPILOT_MODEL=Claude Opus 4.6"
assert_exit "model-gate: ATTA_MODEL_GATE=off → exit 0" 0

# Test 4: --bypass in args → exit 0
run_hook "model-gate.sh" '{"tool_input":{"skill":"atta-lint","args":"--bypass"}}' "ATTA_ADAPTER=copilot" "COPILOT_MODEL=Claude Opus 4.6"
assert_exit "model-gate: --bypass in args → exit 0" 0

# Test 5: Light skill on full model (Copilot) → exit 2 + deny stdout
run_hook "model-gate.sh" '{"tool_input":{"skill":"atta-lint"}}' "ATTA_ADAPTER=copilot" "COPILOT_MODEL=Claude Opus 4.6"
assert_exit_and_deny "model-gate: light skill on full model → exit 2 + deny" 2

# Test 6: Light skill on light model → exit 0
run_hook "model-gate.sh" '{"tool_input":{"skill":"atta-lint"}}' "ATTA_ADAPTER=copilot" "COPILOT_MODEL=Claude Haiku 4.5"
assert_exit "model-gate: light skill on light model → exit 0" 0

# Test 7: Mid skill on full model → exit 2
run_hook "model-gate.sh" '{"tool_input":{"skill":"atta-review"}}' "ATTA_ADAPTER=copilot" "COPILOT_MODEL=Claude Opus 4.6"
assert_exit "model-gate: mid skill on full model → exit 2" 2

# Test 8: Unrecognized model → exit 0 (warn on stderr)
run_hook "model-gate.sh" '{"tool_input":{"skill":"atta-lint"}}' "ATTA_ADAPTER=copilot" "COPILOT_MODEL=some-unknown-model-v99"
assert_exit "model-gate: unrecognized model → exit 0" 0

# Test 9: No model env var (light skill) → exit 0 (warn on stderr)
run_hook "model-gate.sh" '{"tool_input":{"skill":"atta-lint"}}' "ATTA_ADAPTER=copilot"
assert_exit "model-gate: no model env var (light skill) → exit 0" 0

# Test 10: No model env var (mid skill) → exit 0 (skip)
run_hook "model-gate.sh" '{"tool_input":{"skill":"atta-review"}}' "ATTA_ADAPTER=copilot"
assert_exit "model-gate: no model env var (mid skill) → exit 0" 0

# ─── Pre-Bash Safety Tests ───────────────────────────────────────────

echo ""
echo "=== Pre-Bash Safety Tests ==="

# Test 11: Safe command → exit 0
run_hook "pre-bash-safety.sh" '{"tool_input":{"command":"ls -la"}}'
assert_exit "pre-bash-safety: safe command (ls -la) → exit 0" 0

# Test 12: rm -rf / → exit 2 + deny
run_hook "pre-bash-safety.sh" '{"tool_input":{"command":"rm -rf /"}}'
assert_exit_and_deny "pre-bash-safety: rm -rf / → exit 2 + deny" 2

# Test 13: git push --force → exit 2
run_hook "pre-bash-safety.sh" '{"tool_input":{"command":"git push --force origin main"}}'
assert_exit "pre-bash-safety: git push --force → exit 2" 2

# Test 14: git reset --hard → exit 2
run_hook "pre-bash-safety.sh" '{"tool_input":{"command":"git reset --hard HEAD~1"}}'
assert_exit "pre-bash-safety: git reset --hard → exit 2" 2

# Test 15: DROP TABLE → exit 2
run_hook "pre-bash-safety.sh" '{"tool_input":{"command":"psql -c \"DROP TABLE users\""}}'
assert_exit "pre-bash-safety: DROP TABLE → exit 2" 2

# Test 16: Empty command → exit 0
run_hook "pre-bash-safety.sh" '{"tool_input":{"command":""}}'
assert_exit "pre-bash-safety: empty command → exit 0" 0

# ─── Stop Quality Gate Tests ─────────────────────────────────────────

echo ""
echo "=== Stop Quality Gate Tests ==="

# Test 17: Placeholder always exits 0
run_hook "stop-quality-gate.sh" '{}'
assert_exit "stop-quality-gate: placeholder → exit 0" 0

# ─── Cross-Adapter Parsing Tests ──────────────────────────────────────

echo ""
echo "=== Cross-Adapter Parsing Tests ==="

# Test 18: Copilot toolArgs format — model-gate (KNOWN BUG: toolArgs path unreachable)
# data.get('tool_input', {}) returns {} when tool_input absent, isinstance({}, dict) is True,
# so the elif 'toolArgs' branch never executes. Skill extracted as empty → exit 0 (skip).
# Documenting actual behavior here; fix belongs in a separate track.
run_hook "model-gate.sh" '{"toolArgs":"{\"skill\":\"atta-lint\",\"args\":\"\"}"}' "ATTA_ADAPTER=copilot" "COPILOT_MODEL=Claude Opus 4.6"
assert_exit "cross-adapter: copilot toolArgs model-gate → exit 0 (KNOWN BUG: toolArgs unreachable)" 0

# Test 19: Copilot toolArgs format — pre-bash-safety blocks destructive command
run_hook "pre-bash-safety.sh" '{"toolArgs":"{\"command\":\"rm -rf /\"}"}'
assert_exit "cross-adapter: copilot toolArgs pre-bash-safety blocks → exit 2" 2

# Test 20: Cursor model field in stdin — model-gate detects model from stdin JSON
run_hook "model-gate.sh" '{"tool_input":{"skill":"atta-lint"},"model":"claude-opus-4-6"}' "ATTA_ADAPTER=cursor"
assert_exit "cross-adapter: cursor stdin model field model-gate blocks → exit 2" 2

# Test 21: Cursor model field — light model allows light skill
run_hook "model-gate.sh" '{"tool_input":{"skill":"atta-lint"},"model":"claude-haiku-4-5"}' "ATTA_ADAPTER=cursor"
assert_exit "cross-adapter: cursor stdin model light skill on light model → exit 0" 0

# ─── Hook Profile Tests (ATTA_HOOKS env var) ─────────────────────────

echo ""
echo "=== Hook Profile Tests ==="

# Test 22: ATTA_HOOKS=off skips model-gate (would normally block)
run_hook "model-gate.sh" '{"tool_input":{"skill":"atta-lint"}}' "ATTA_HOOKS=off" "ATTA_ADAPTER=copilot" "COPILOT_MODEL=Claude Opus 4.6"
assert_exit "profile: ATTA_HOOKS=off skips model-gate → exit 0" 0

# Test 23: ATTA_HOOKS=minimal skips model-gate (would normally block)
run_hook "model-gate.sh" '{"tool_input":{"skill":"atta-lint"}}' "ATTA_HOOKS=minimal" "ATTA_ADAPTER=copilot" "COPILOT_MODEL=Claude Opus 4.6"
assert_exit "profile: ATTA_HOOKS=minimal skips model-gate → exit 0" 0

# Test 24: ATTA_HOOKS=standard does NOT skip model-gate (still blocks)
run_hook "model-gate.sh" '{"tool_input":{"skill":"atta-lint"}}' "ATTA_HOOKS=standard" "ATTA_ADAPTER=copilot" "COPILOT_MODEL=Claude Opus 4.6"
assert_exit "profile: ATTA_HOOKS=standard model-gate still blocks → exit 2" 2

# Test 25: ATTA_HOOKS=off skips pre-bash-safety (would normally block)
run_hook "pre-bash-safety.sh" '{"tool_input":{"command":"rm -rf /"}}' "ATTA_HOOKS=off"
assert_exit "profile: ATTA_HOOKS=off skips pre-bash-safety → exit 0" 0

# Test 26: ATTA_HOOKS=minimal does NOT skip pre-bash-safety (critical hook)
run_hook "pre-bash-safety.sh" '{"tool_input":{"command":"rm -rf /"}}' "ATTA_HOOKS=minimal"
assert_exit "profile: ATTA_HOOKS=minimal pre-bash-safety still blocks → exit 2" 2

# Test 27: ATTA_HOOKS=off skips stop-quality-gate
run_hook "stop-quality-gate.sh" '{}' "ATTA_HOOKS=off"
assert_exit "profile: ATTA_HOOKS=off skips stop-quality-gate → exit 0" 0

# Test 28: ATTA_HOOKS=minimal skips stop-quality-gate
run_hook "stop-quality-gate.sh" '{}' "ATTA_HOOKS=minimal"
assert_exit "profile: ATTA_HOOKS=minimal skips stop-quality-gate → exit 0" 0

# ─── Results ──────────────────────────────────────────────────────────
echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: $ERRORS test(s) failed"
  exit 1
else
  echo "ALL TESTS PASSED (28 tests)"
fi
