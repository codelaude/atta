#!/bin/bash
# check-matrix-schema.sh
# Validates capability-matrix.yaml against capability-matrix.schema.json
# Requires: python3 + pyyaml + jsonschema
#   Install: pip3 install pyyaml jsonschema

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MATRIX="$REPO_ROOT/src/core/capability-matrix.yaml"
SCHEMA="$REPO_ROOT/src/core/capability-matrix.schema.json"

# Dependency check
for mod in yaml jsonschema; do
  python3 -c "import $mod" 2>/dev/null || {
    echo "FAIL: Missing python3 module '$mod'. Install: pip3 install pyyaml jsonschema"
    exit 1
  }
done

# Check files exist
for f in "$MATRIX" "$SCHEMA"; do
  if [ ! -f "$f" ]; then
    echo "FAIL: File not found: $f"
    exit 1
  fi
done

TMPJSON=$(mktemp)
trap "rm -f $TMPJSON" EXIT

# Convert YAML to JSON for validation
python3 -c "
import yaml, json, sys
with open('$MATRIX') as f:
    data = yaml.safe_load(f)
json.dump(data, sys.stdout)
" > "$TMPJSON"

# Validate against schema
python3 -c "
import json, sys
from jsonschema import validate, ValidationError

with open('$SCHEMA') as sf:
    schema = json.load(sf)
with open('$TMPJSON') as df:
    data = json.load(df)

try:
    validate(instance=data, schema=schema)
    print('PASS: Matrix validates against schema')
    sys.exit(0)
except ValidationError as e:
    print(f'FAIL: {e.message}')
    sys.exit(1)
"
