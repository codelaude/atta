#!/usr/bin/env bash
# Smoke test for the GitHub Action adapter
# Verifies that atta init --adapter github-action generates the expected files

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

WORK_DIR=$(mktemp -d)
WORK_DIR2=$(mktemp -d)
WORK_DIR3=$(mktemp -d)
trap 'rm -rf "$WORK_DIR" "$WORK_DIR2" "$WORK_DIR3"' EXIT

cd "$REPO_ROOT"

# Run adapter install directly via Node
node --input-type=module <<EOF
import { install } from './src/adapters/github-action.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const claudeRoot = '${REPO_ROOT}/.claude';
const attaRoot   = '${REPO_ROOT}/.atta';
const targetDir  = '${WORK_DIR}';

const results = install(claudeRoot, attaRoot, targetDir, { quiet: true });

const checks = [
  [join(targetDir, '.github', 'workflows', 'atta-review.yml'), 'workflow file'],
  [join(targetDir, '.atta', 'knowledge', 'ci-suppressions.md'), 'ci-suppressions.md'],
  [join(targetDir, '.atta', 'knowledge'), 'shared knowledge/'],
  [join(targetDir, '.atta', 'bootstrap'), 'shared bootstrap/'],
];

let failed = 0;
for (const [path, label] of checks) {
  if (!existsSync(path)) {
    console.error('FAIL: missing ' + label + ' at ' + path);
    failed++;
  }
}

// Verify workflow contains key content (default: anthropic/v1 path)
import { readFileSync } from 'node:fs';
const workflow = readFileSync(join(targetDir, '.github', 'workflows', 'atta-review.yml'), 'utf-8');
const contentChecks = [
  ['claude-code-action@v1', 'action v1 reference'],
  ['prompt:', 'prompt field'],
  ['anthropic_api_key:', 'API key reference'],
  ['.atta/knowledge/project/project-context.md', 'project-context.md reference'],
  ['.atta/knowledge/ci-suppressions.md', 'suppressions reference'],
  ['pull_request:', 'PR trigger'],
  ['ready_for_review', 'ready_for_review trigger'],
];
for (const [needle, label] of contentChecks) {
  if (!workflow.includes(needle)) {
    console.error('FAIL: workflow missing ' + label);
    failed++;
  }
}
// Verify @beta is gone
if (workflow.includes('@beta')) {
  console.error('FAIL: workflow still references @beta (should be @v1)');
  failed++;
}
// Verify direct_prompt is gone
if (workflow.includes('direct_prompt:')) {
  console.error('FAIL: workflow still uses direct_prompt: (should be prompt:)');
  failed++;
}

if (failed === 0) {
  console.log('PASS: GitHub Action adapter output structure correct (' + results.files + ' files installed)');
  process.exit(0);
} else {
  process.exit(1);
}
EOF

# Idempotency check: write sentinel content to ci-suppressions.md, re-run, verify not overwritten
SENTINEL="# sentinel-do-not-overwrite"
echo "$SENTINEL" >> "$WORK_DIR/.atta/knowledge/ci-suppressions.md"

node --input-type=module <<EOF2
import { install } from './src/adapters/github-action.js';
const claudeRoot = '${REPO_ROOT}/.claude';
const attaRoot   = '${REPO_ROOT}/.atta';
const targetDir  = '${WORK_DIR}';
install(claudeRoot, attaRoot, targetDir, { quiet: true });
EOF2

if grep -qF "$SENTINEL" "$WORK_DIR/.atta/knowledge/ci-suppressions.md"; then
  echo "PASS: ci-suppressions.md preserved on re-run (not overwritten)"
else
  echo "FAIL: ci-suppressions.md was overwritten on re-run"
  exit 1
fi

# Auth backend check: verify bedrock variant generates correct fields

node --input-type=module <<EOF3
import { install } from './src/adapters/github-action.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const claudeRoot = '${REPO_ROOT}/.claude';
const attaRoot   = '${REPO_ROOT}/.atta';
const targetDir  = '${WORK_DIR2}';

install(claudeRoot, attaRoot, targetDir, { quiet: true, authBackend: 'bedrock' });

const workflow = readFileSync(join(targetDir, '.github', 'workflows', 'atta-review.yml'), 'utf-8');
let failed = 0;

if (!workflow.includes('use_bedrock')) {
  console.error('FAIL: bedrock workflow missing use_bedrock');
  failed++;
}
if (!workflow.includes('AWS_ACCESS_KEY_ID')) {
  console.error('FAIL: bedrock workflow missing AWS_ACCESS_KEY_ID env');
  failed++;
}
if (workflow.includes('anthropic_api_key:')) {
  console.error('FAIL: bedrock workflow should not contain anthropic_api_key');
  failed++;
}

if (failed === 0) {
  console.log('PASS: bedrock auth backend generates correct workflow');
} else {
  process.exit(1);
}
EOF3

# Provider check: verify openai variant uses appleboy/LLM-action

node --input-type=module <<EOF4
import { install } from './src/adapters/github-action.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const claudeRoot = '${REPO_ROOT}/.claude';
const attaRoot   = '${REPO_ROOT}/.atta';
const targetDir  = '${WORK_DIR3}';

install(claudeRoot, attaRoot, targetDir, { quiet: true, provider: 'openai' });

const workflow = readFileSync(join(targetDir, '.github', 'workflows', 'atta-review.yml'), 'utf-8');
let failed = 0;

if (!workflow.includes('appleboy/LLM-action')) {
  console.error('FAIL: openai workflow should use appleboy/LLM-action');
  failed++;
}
if (!workflow.includes('OPENAI_API_KEY')) {
  console.error('FAIL: openai workflow missing OPENAI_API_KEY reference');
  failed++;
}
if (workflow.includes('claude-code-action')) {
  console.error('FAIL: openai workflow should not reference claude-code-action');
  failed++;
}
// Prompt body should still be present
if (!workflow.includes('.atta/knowledge/project/project-context.md')) {
  console.error('FAIL: openai workflow missing project-context.md reference in prompt');
  failed++;
}

if (failed === 0) {
  console.log('PASS: openai provider generates correct LLM-action workflow');
} else {
  process.exit(1);
}
EOF4
