#!/bin/bash
# check-all.sh — Run pre-launch checks
# Usage: check-all.sh [--full]
#   Default: 6 core checks (required for Tier 1 launch)
#   --full:  6 core + 1 optional (Gemini, required for Full launch)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

PASS=0
FAIL=0
OPT_PASS=0
OPT_FAIL=0

# Core checks (required for launch)
for check in \
  check-matrix-schema.sh \
  check-claude-adapter.sh \
  check-copilot-adapter.sh \
  check-codex-adapter.sh \
  check-agents-md-generator.sh \
  check-github-action-adapter.sh
do
  echo "--- [CORE] Running $check ---"
  if bash "$SCRIPT_DIR/$check"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
  echo ""
done

# Optional checks (Tier 2)
if [ "${1:-}" = "--full" ]; then
  for check in check-gemini-adapter.sh; do
    if [ -f "$SCRIPT_DIR/$check" ]; then
      echo "--- [OPTIONAL] Running $check ---"
      if bash "$SCRIPT_DIR/$check"; then
        OPT_PASS=$((OPT_PASS + 1))
      else
        OPT_FAIL=$((OPT_FAIL + 1))
      fi
      echo ""
    else
      echo "--- [OPTIONAL] $check not found (skipped) ---"
      echo ""
    fi
  done
fi

echo "================================"
echo "Core:     $PASS passed, $FAIL failed"
[ "${1:-}" = "--full" ] && echo "Optional: $OPT_PASS passed, $OPT_FAIL failed"
echo "================================"

[ $FAIL -eq 0 ] && exit 0 || exit 1
