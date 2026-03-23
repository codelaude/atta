#!/bin/bash
# check-owasp-scope.sh
# Verifies OWASP scope generator correctly classifies techs from detection YAML
# and produces appropriate scope for different project types.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ATTA_ROOT="$REPO_ROOT/.atta"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

ERRORS=0

run_test() {
  local name="$1"
  local techs_json="$2" # JSON array of tech identifiers
  local check_fn="$3"   # JS expression that evaluates to true/false
  local result
  local rc=0

  set +e
  result=$(node --input-type=module <<JSEOF
import { classifyProjectType, computeOwaspScope } from '$REPO_ROOT/src/lib/owasp-scope.js';
const techs = $techs_json;
const types = classifyProjectType(techs, '$ATTA_ROOT');
const scope = computeOwaspScope(techs, '$ATTA_ROOT');
const check = $check_fn;
if (check) {
  console.log('OK');
} else {
  console.log(JSON.stringify({ types, applicable: scope.applicable.map(a => a.code), deprioritized: scope.deprioritized.map(d => d.code), skipped: scope.skipped.map(s => s.code), projectTypes: scope.projectTypes }));
}
JSEOF
  )
  rc=$?
  set -e

  if [ "$rc" -ne 0 ]; then
    echo "FAIL: $name — script error (exit code $rc)"
    ERRORS=$((ERRORS + 1))
    return
  fi

  if [ "$result" = "OK" ]; then
    echo "PASS: $name"
  else
    echo "FAIL: $name — $result"
    ERRORS=$((ERRORS + 1))
  fi
}

# ─── Test 1: Empty techs → defaults to backend (all categories) ─────
run_test "empty-techs-default-backend" \
  "[]" \
  "types.includes('backend') && types.length === 1"

# ─── Test 2: null techs → defaults to backend ───────────────────────
run_test "null-techs-default-backend" \
  "null" \
  "types.includes('backend') && types.length === 1"

# ─── Test 3: Backend tech → backend type ─────────────────────────────
run_test "express-is-backend" \
  '["express"]' \
  "types.includes('backend') && !types.includes('frontend')"

# ─── Test 4: Frontend tech → frontend type ───────────────────────────
run_test "react-is-frontend" \
  '["react"]' \
  "types.includes('frontend') && !types.includes('backend')"

# ─── Test 5: Next.js → classified as fullstack (from owasp_type metadata) ──
run_test "nextjs-is-fullstack" \
  '["nextjs"]' \
  "types.includes('fullstack') && types.includes('frontend') && types.includes('backend')"

# ─── Test 6: Nuxt → classified as fullstack ──────────────────────────
run_test "nuxt-is-fullstack" \
  '["nuxt"]' \
  "types.includes('fullstack')"

# ─── Test 7: Astro → classified as fullstack ─────────────────────────
run_test "astro-is-fullstack" \
  '["astro"]' \
  "types.includes('fullstack') && types.includes('frontend') && types.includes('backend')"

# ─── Test 8: Mixed frontend + backend → both types ──────────────────
run_test "mixed-frontend-backend" \
  '["react", "express"]' \
  "types.includes('frontend') && types.includes('backend')"

# ─── Test 9: Frontend-only → has deprioritized categories (low) ──────
run_test "frontend-deprioritizes-some-owasp" \
  '["react"]' \
  "scope.deprioritized.some(d => d.code === 'A02') && scope.deprioritized.some(d => d.code === 'A09')"

# ─── Test 10: Backend → all 10 categories applicable ────────────────
run_test "backend-all-categories" \
  '["express"]' \
  "scope.applicable.length === 10 && scope.deprioritized.length === 0 && scope.skipped.length === 0"

# ─── Test 11: Fullstack → all 10 categories applicable ──────────────
run_test "fullstack-all-categories" \
  '["nextjs"]' \
  "scope.applicable.length === 10 && scope.skipped.length === 0"

# ─── Test 12: Unknown tech → defaults to backend (conservative) ─────
run_test "unknown-tech-defaults-backend" \
  '["some-unknown-framework"]' \
  "types.includes('backend') && types.length === 1"

# ─── Test 13: Merge rule — higher relevance wins ────────────────────
# React (frontend) has A03 as HIGH. If combined with express (backend, also HIGH),
# the merged result should be HIGH (not downgraded).
run_test "merge-highest-wins" \
  '["react", "express"]' \
  "scope.applicable.some(a => a.code === 'A03' && a.level === 'high')"

# ─── Test 14: writeOwaspScope produces a file ───────────────────────
set +e
result=$(node --input-type=module <<JSEOF
import { writeOwaspScope } from '$REPO_ROOT/src/lib/owasp-scope.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
writeOwaspScope('$WORK_DIR', ['react', 'express'], '$ATTA_ROOT');
const filePath = join('$WORK_DIR', '.atta', 'team', 'owasp-scope.md');
if (!existsSync(filePath)) {
  console.log('FILE_MISSING');
} else {
  const content = readFileSync(filePath, 'utf-8');
  const hasHeader = content.includes('# OWASP Scope');
  const hasTable = content.includes('| Code | Category |');
  const hasTypes = content.includes('frontend') && content.includes('backend');
  if (hasHeader && hasTable && hasTypes) {
    console.log('OK');
  } else {
    console.log('CONTENT_WRONG');
  }
}
JSEOF
)
rc=$?
set -e

if [ "$rc" -ne 0 ]; then
  echo "FAIL: write-owasp-scope — script error (exit code $rc)"
  ERRORS=$((ERRORS + 1))
elif [ "$result" = "OK" ]; then
  echo "PASS: write-owasp-scope"
else
  echo "FAIL: write-owasp-scope — $result"
  ERRORS=$((ERRORS + 1))
fi

# ─── Test 15: extractTechEntries reads real detection YAML ───────────
set +e
result=$(node --input-type=module <<JSEOF
import { classifyProjectType } from '$REPO_ROOT/src/lib/owasp-scope.js';
// Django is in backend-detectors.yaml — should classify as backend
const types = classifyProjectType(['django'], '$ATTA_ROOT');
if (types.includes('backend')) {
  console.log('OK');
} else {
  console.log(JSON.stringify(types));
}
JSEOF
)
rc=$?
set -e

if [ "$rc" -ne 0 ]; then
  echo "FAIL: reads-detection-yaml — script error (exit code $rc)"
  ERRORS=$((ERRORS + 1))
elif [ "$result" = "OK" ]; then
  echo "PASS: reads-detection-yaml (django → backend from YAML)"
else
  echo "FAIL: reads-detection-yaml — $result"
  ERRORS=$((ERRORS + 1))
fi

# ─── Results ──────────────────────────────────────────────────────────
echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: $ERRORS test(s) failed"
  exit 1
else
  echo "ALL TESTS PASSED"
fi
