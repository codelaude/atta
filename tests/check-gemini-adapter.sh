#!/bin/bash
# check-gemini-adapter.sh
# Verifies Gemini adapter produces valid TOML commands and extension manifest
# Requires: python3 (3.11+ for tomllib, or tomli fallback)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

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
node "$REPO_ROOT/bin/atta.js" init --directory "$TMPDIR" --adapter gemini --yes > /dev/null 2>&1

ERRORS=0

# Check gemini-extension.json exists and is valid JSON
if [ ! -f "$TMPDIR/gemini-extension.json" ]; then
  echo "FAIL: gemini-extension.json not generated"
  ERRORS=$((ERRORS + 1))
else
  python3 -c "
import json, sys
with open('$TMPDIR/gemini-extension.json') as f:
    data = json.load(f)
for field in ['name', 'version']:
    if field not in data:
        print(f'FAIL: gemini-extension.json missing field: {field}')
        sys.exit(1)
" 2>/dev/null || ERRORS=$((ERRORS + 1))
fi

# Check GEMINI.md exists and is non-empty
if [ ! -s "$TMPDIR/GEMINI.md" ]; then
  echo "FAIL: GEMINI.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

# Check GETTING-STARTED.md exists
if [ ! -s "$TMPDIR/GETTING-STARTED.md" ]; then
  echo "FAIL: GETTING-STARTED.md missing or empty"
  ERRORS=$((ERRORS + 1))
fi

# Check TOML commands exist, parse correctly, and have required fields
TOML_COUNT=0
if [ -d "$TMPDIR/commands" ]; then
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
  done < <(find "$TMPDIR/commands" -name "*.toml" -print0 2>/dev/null)
fi

if [ "$TOML_COUNT" -eq 0 ]; then
  echo "FAIL: No TOML commands generated in commands/"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
  echo "PASS: Gemini adapter output valid ($TOML_COUNT TOML commands, syntax-verified)"
  exit 0
else
  echo "FAIL: $ERRORS errors found"
  exit 1
fi
