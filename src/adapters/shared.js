import { existsSync, mkdirSync, cpSync, lstatSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import pc from 'picocolors';

/**
 * Shared utilities for all adapters.
 */

/**
 * Cross-tool hook event mapping — canonical compatibility table.
 * Maps semantic event names to each tool's native event name.
 * Used by generateHooks() to produce per-adapter hook configs.
 *
 * Event counts (verified March 2026):
 *   Claude Code: 18 events, 4 types (command, http, prompt, agent)
 *   Cursor: 20 events, 2 types (command, prompt)
 *   Gemini: 11 events, 1 type (command)
 *   Copilot: 8 events (Coding Agent) / 6 (CLI), 1 type (command)
 *   Codex: 2 events (experimental, behind feature flag), 1 type (command)
 *
 * @type {Object<string, Object<string, string|null>>}
 */
export const HOOK_EVENT_MAP = {
  // Session lifecycle
  sessionStart:        { 'claude-code': 'SessionStart',       copilot: 'sessionStart',        cursor: 'sessionStart',           gemini: 'SessionStart',        codex: 'SessionStart' },
  sessionEnd:          { 'claude-code': 'SessionEnd',         copilot: 'sessionEnd',          cursor: 'sessionEnd',             gemini: 'SessionEnd',          codex: null },
  stop:                { 'claude-code': 'Stop',               copilot: 'agentStop',           cursor: 'stop',                   gemini: null,                  codex: 'Stop' },
  // Tool lifecycle
  preToolUse:          { 'claude-code': 'PreToolUse',         copilot: 'preToolUse',          cursor: 'preToolUse',             gemini: 'BeforeTool',          codex: null },
  postToolUse:         { 'claude-code': 'PostToolUse',        copilot: 'postToolUse',         cursor: 'postToolUse',            gemini: 'AfterTool',           codex: null },
  postToolUseFailure:  { 'claude-code': 'PostToolUseFailure', copilot: 'errorOccurred',       cursor: 'postToolUseFailure',     gemini: null,                  codex: null },
  // User interaction
  userPromptSubmit:    { 'claude-code': 'UserPromptSubmit',   copilot: 'userPromptSubmitted', cursor: 'beforeSubmitPrompt',      gemini: null,                  codex: null },
  // Agent lifecycle
  subagentStart:       { 'claude-code': 'SubagentStart',      copilot: null,                  cursor: 'subagentStart',          gemini: 'BeforeAgent',         codex: null },
  subagentStop:        { 'claude-code': 'SubagentStop',       copilot: 'subagentStop',        cursor: 'subagentStop',           gemini: 'AfterAgent',          codex: null },
  // Context management
  preCompact:          { 'claude-code': 'PreCompact',         copilot: null,                  cursor: 'preCompact',             gemini: 'PreCompress',         codex: null },
  notification:        { 'claude-code': 'Notification',       copilot: null,                  cursor: null,                     gemini: 'Notification',        codex: null },
  // File events
  afterFileEdit:       { 'claude-code': null,                 copilot: null,                  cursor: 'afterFileEdit',          gemini: null,                  codex: null },
  beforeShellExec:     { 'claude-code': null,                 copilot: null,                  cursor: 'beforeShellExecution',   gemini: null,                  codex: null },
  // Claude Code-only events
  permissionRequest:   { 'claude-code': 'PermissionRequest',  copilot: null,                  cursor: null,                     gemini: null,                  codex: null },
  taskCompleted:       { 'claude-code': 'TaskCompleted',      copilot: null,                  cursor: null,                     gemini: null,                  codex: null },
  configChange:        { 'claude-code': 'ConfigChange',       copilot: null,                  cursor: null,                     gemini: null,                  codex: null },
  // Gemini-only events
  beforeModel:         { 'claude-code': null,                 copilot: null,                  cursor: null,                     gemini: 'BeforeModel',         codex: null },
  afterModel:          { 'claude-code': null,                 copilot: null,                  cursor: null,                     gemini: 'AfterModel',          codex: null },
  beforeToolSelection: { 'claude-code': null,                 copilot: null,                  cursor: null,                     gemini: 'BeforeToolSelection', codex: null },
};

// ─── Hook Generation ────────────────────────────────────────────────

/**
 * Pre-bash safety prompt — used by Claude Code and Cursor (prompt type).
 * Evaluates whether a shell command is destructive before execution.
 */
const SAFETY_PROMPT = [
  'Review the proposed shell command for safety.',
  'Block (return ok:false) if the command would:',
  '- Delete files recursively (rm -rf, git clean -fdx)',
  '- Force-push or reset git history (git push --force, git reset --hard)',
  '- Drop database tables or truncate data',
  '- Modify system files outside the project directory',
  '- Run curl/wget piped to shell (curl | sh)',
  'Allow all other commands. Input: $ARGUMENTS',
].join(' ');

/**
 * Stop quality gate prompt — used by Claude Code and Cursor (prompt type).
 * Checks whether the agent completed its work properly.
 */
const QUALITY_GATE_PROMPT = [
  'Before ending, verify:',
  '1. All requested tasks are complete',
  '2. No TODO/FIXME comments were left unresolved',
  '3. No files were left in a broken state',
  'If issues remain, return ok:false with a brief reason. Input: $ARGUMENTS',
].join(' ');

/**
 * Generate a hooks config for a specific adapter with enforcement hooks.
 * Replaces the old generateHooksConfig() which only produced empty placeholders.
 *
 * Generates enforcement hooks per adapter (varies by tool capability):
 *   1. Post-edit lint (when linter detected) — runs linter after file edits
 *   2. Pre-bash safety — blocks destructive shell commands
 *   3. Stop quality gate — checks task completion before ending
 *
 * Not all tools support all hooks:
 *   - Gemini lacks a stop event → no quality gate
 *   - Codex is experimental → empty placeholder events only
 *
 * Cross-tool hook type support:
 *   Claude Code + Cursor: prompt type for safety/quality gates
 *   Copilot + Gemini: command type with exit-code/stdout blocking
 *
 * @param {'claude-code'|'copilot'|'cursor'|'gemini'|'codex'} adapter
 * @param {string[]} [detectedTechs] - Detected technology identifiers (for linter hooks)
 * @returns {object} hooks.json content ready to serialize
 */
export function generateHooks(adapter, detectedTechs) {
  if (adapter === 'claude-code') return generateClaudeCodeHooks(detectedTechs);
  if (adapter === 'copilot') return generateCopilotHooks(detectedTechs);
  if (adapter === 'cursor') return generateCursorHooks(detectedTechs);
  if (adapter === 'gemini') return generateGeminiHooks(detectedTechs);
  if (adapter === 'codex') return generateCodexHooks();

  throw new Error(`generateHooks: unknown adapter "${adapter}"`);
}

/**
 * @deprecated Use generateHooks() instead. Kept for backwards compatibility.
 */
export function generateHooksConfig(adapter) {
  return generateHooks(adapter);
}

// ─── Per-Adapter Hook Generators ─────────────────────────────────────

/**
 * Claude Code hooks — 4 types supported (command, http, prompt, agent).
 * Format: { "hooks": { "EventName": [{ matcher?, hooks: [{ type, command|prompt, ... }] }] } }
 */
function generateClaudeCodeHooks(detectedTechs) {
  const hooks = {};

  // Post-edit lint hook (when linter detected)
  const lintCmd = detectLintCommand(detectedTechs);
  if (lintCmd) {
    hooks[HOOK_EVENT_MAP.postToolUse['claude-code']] = [
      {
        matcher: 'Edit|Write',
        hooks: [{ type: 'command', command: lintCmd, timeout: 30 }],
      },
    ];
  }

  // Pre-bash safety (prompt type — AI evaluates the command)
  hooks[HOOK_EVENT_MAP.preToolUse['claude-code']] = [
    {
      matcher: 'Bash',
      hooks: [{ type: 'prompt', prompt: SAFETY_PROMPT, timeout: 15 }],
    },
  ];

  // Stop quality gate (prompt type)
  hooks[HOOK_EVENT_MAP.stop['claude-code']] = [
    {
      hooks: [{ type: 'prompt', prompt: QUALITY_GATE_PROMPT, timeout: 15 }],
    },
  ];

  return { hooks };
}

/**
 * Copilot hooks — command type only, uses bash/powershell fields.
 * Format: { version: 1, hooks: { eventName: [{ type, bash, timeoutSec, ... }] } }
 */
function generateCopilotHooks(detectedTechs) {
  const hooks = {};

  // Post-edit lint hook (when linter detected)
  const lintCmd = detectLintCommand(detectedTechs);
  if (lintCmd) {
    hooks[HOOK_EVENT_MAP.postToolUse.copilot] = [
      { type: 'command', bash: lintCmd, timeoutSec: 30 },
    ];
  }

  // Pre-tool safety (command type — stdout permissionDecision to block)
  hooks[HOOK_EVENT_MAP.preToolUse.copilot] = [
    {
      type: 'command',
      bash: 'bash .atta/scripts/hooks/pre-bash-safety.sh',
      timeoutSec: 5,
      comment: 'Block destructive shell commands (rm -rf, git push --force, etc.)',
    },
    {
      type: 'command',
      bash: 'ATTA_ADAPTER=copilot bash .atta/scripts/hooks/model-gate.sh',
      timeoutSec: 5,
      comment: 'Block skills running on costlier models than needed (--bypass to override)',
    },
  ];

  // Agent stop quality gate (command type)
  hooks[HOOK_EVENT_MAP.stop.copilot] = [
    {
      type: 'command',
      bash: 'bash .atta/scripts/hooks/stop-quality-gate.sh',
      timeoutSec: 5,
      comment: 'Placeholder — customize with project-specific completion checks',
    },
  ];

  return { version: 1, hooks };
}

/**
 * Cursor hooks — command + prompt types supported.
 * Format: { version: 1, hooks: { eventName: [{ type, command|prompt, timeout, ... }] } }
 */
function generateCursorHooks(detectedTechs) {
  const hooks = {};

  // Post-edit lint hook (when linter detected) — scoped to file-edit tools
  const lintCmd = detectLintCommand(detectedTechs);
  if (lintCmd) {
    hooks[HOOK_EVENT_MAP.postToolUse.cursor] = [
      { type: 'command', command: lintCmd, timeout: 30, matcher: { tool_name: 'EditFile' } },
    ];
  }

  // Pre-tool safety (prompt type — AI evaluates the command)
  hooks[HOOK_EVENT_MAP.preToolUse.cursor] = [
    {
      type: 'prompt',
      prompt: SAFETY_PROMPT,
      timeout: 15,
      matcher: { tool_name: 'Shell' },
    },
    {
      type: 'command',
      command: 'ATTA_ADAPTER=cursor bash .atta/scripts/hooks/model-gate.sh',
      timeout: 5,
      matcher: { tool_name: 'Skill' },
    },
  ];

  // Stop quality gate (prompt type)
  hooks[HOOK_EVENT_MAP.stop.cursor] = [
    {
      type: 'prompt',
      prompt: QUALITY_GATE_PROMPT,
      timeout: 15,
      loop_limit: 3,
    },
  ];

  return { version: 1, hooks };
}

/**
 * Gemini hooks — command type only, PascalCase events.
 * Format: { hooks: { EventName: [{ matcher?, hooks: [{ type, command, timeout }] }] } }
 */
function generateGeminiHooks(detectedTechs) {
  const hooks = {};

  // Post-edit lint hook (when linter detected)
  const lintCmd = detectLintCommand(detectedTechs);
  if (lintCmd) {
    hooks[HOOK_EVENT_MAP.postToolUse.gemini] = [
      {
        matcher: 'write_file|replace',
        hooks: [{ type: 'command', command: lintCmd, timeout: 30000 }], // Gemini: milliseconds
      },
    ];
  }

  // Pre-tool safety (command type — exit code 2 to block)
  // Scoped to shell/command tools only (Gemini tool names vary by model)
  hooks[HOOK_EVENT_MAP.preToolUse.gemini] = [
    {
      matcher: 'run_command|execute_command|shell|bash',
      hooks: [
        {
          type: 'command',
          command: 'bash .atta/scripts/hooks/pre-bash-safety.sh',
          timeout: 5000, // Gemini: milliseconds
        },
      ],
    },
    {
      matcher: 'skill|command',
      hooks: [
        {
          type: 'command',
          command: 'ATTA_ADAPTER=gemini bash .atta/scripts/hooks/model-gate.sh',
          timeout: 5000, // Gemini: milliseconds
        },
      ],
    },
  ];

  return { hooks };
}

/**
 * Codex hooks — experimental, behind feature flag.
 * Only SessionStart and Stop events supported.
 */
function generateCodexHooks() {
  return {
    hooks: {
      [HOOK_EVENT_MAP.sessionStart.codex]: [],
      [HOOK_EVENT_MAP.stop.codex]: [],
    },
  };
}

// ─── Linter Detection ────────────────────────────────────────────────

/**
 * Map detected tech identifiers to lint commands.
 * Returns a shell command string or null if no linter is detected.
 *
 * Note: detectedTechs is populated by the bootstrap system (tool-detectors.yaml)
 * after the user runs `/atta` to detect their stack. On fresh `init --yes`,
 * detectedTechs is empty — lint hooks activate on subsequent re-init after detection.
 *
 * @param {string[]} [detectedTechs]
 * @returns {string|null}
 */
function detectLintCommand(detectedTechs) {
  if (!detectedTechs || detectedTechs.length === 0) return null;

  const techs = new Set(detectedTechs);

  // JavaScript/TypeScript ecosystem (lint-only, no auto-fix — hook fires on every edit)
  if (techs.has('eslint')) return 'npx eslint --quiet .';
  if (techs.has('biome')) return 'npx biome check .';
  if (techs.has('prettier')) return 'npx prettier --check --log-level warn .';

  // Python ecosystem
  if (techs.has('ruff')) return 'ruff check --quiet .';
  if (techs.has('black')) return 'black --check --quiet .';
  if (techs.has('flake8')) return 'flake8 --quiet .';

  // Go
  if (techs.has('go') || techs.has('gofmt')) return 'test -z "$(gofmt -l .)"';

  // Rust
  if (techs.has('rust')) return 'cargo fmt --check --quiet';

  return null;
}

// ─── Hook Scripts ────────────────────────────────────────────────────

/**
 * Pre-bash safety hook script content — for tools that only support command hooks.
 * Reads tool input from stdin JSON, checks for destructive patterns.
 * Exit code 2 = block (Claude Code, Gemini); stdout JSON = block (Copilot).
 */
export const PRE_BASH_SAFETY_SCRIPT = `#!/bin/bash
# pre-bash-safety.sh — Block destructive shell commands
# Generated by Atta. Works with Copilot (stdout JSON) and Gemini (exit code 2).
set -euo pipefail

INPUT=$(cat)

# Extract the command from stdin JSON (tool_input.command or toolArgs)
CMD=$(echo "$INPUT" | python3 -c "
import json, sys
data = json.load(sys.stdin)
# Claude Code / Cursor / Gemini
if 'tool_input' in data:
    ti = data['tool_input']
    print(ti.get('command', '') if isinstance(ti, dict) else '')
# Copilot
elif 'toolArgs' in data:
    try:
        args = json.loads(data['toolArgs'])
        print(args.get('command', ''))
    except:
        print('')
else:
    print('')
" 2>/dev/null || echo "")

if [ -z "$CMD" ]; then
  exit 0
fi

# Check for destructive patterns
BLOCKED=""
case "$CMD" in
  *"rm -rf /"*|*"rm -rf ~"*|*"rm -rf ."*|*"rm -r -f "*|*"rm --recursive --force"*)
    BLOCKED="Recursive force delete" ;;
  *"git push --force"*|*"git push -f "*|*"git push -f\\"*"|*"git push --force-with-lease"*)
    BLOCKED="Force push can destroy remote history" ;;
  *"git reset --hard"*)
    BLOCKED="Hard reset discards uncommitted changes" ;;
  *"git clean -f"*|*"git clean -fd"*)
    BLOCKED="Clean removes untracked files permanently" ;;
  *"| sh"*|*"| bash"*)
    BLOCKED="Piping to shell is unsafe" ;;
  *"DROP TABLE"*|*"drop table"*|*"TRUNCATE"*|*"truncate"*)
    BLOCKED="Destructive database operation" ;;
esac

if [ -n "$BLOCKED" ]; then
  # Copilot: stdout JSON with permissionDecision (env var avoids shell injection)
  BLOCKED="$BLOCKED" python3 -c "import json,os; print(json.dumps({'permissionDecision':'deny','permissionDecisionReason':os.environ['BLOCKED']}))" 2>/dev/null || echo '{"permissionDecision":"deny","permissionDecisionReason":"blocked"}'
  # Gemini / Claude Code: exit code 2 = block
  exit 2
fi

exit 0
`;

/**
 * Stop quality gate hook script content — for tools that only support command hooks.
 * Passive placeholder — exits 0 without blocking. Customize with project-specific checks.
 */
export const STOP_QUALITY_GATE_SCRIPT = `#!/bin/bash
# stop-quality-gate.sh — Placeholder for project-specific completion checks
# Generated by Atta. Customize this script to add quality gates on agent stop.
set -euo pipefail

# This is a passive placeholder — does not block or produce output.
# For AI-powered quality gates, use Claude Code or Cursor (prompt type hooks).
exit 0
`;

/**
 * Model gate hook script — blocks skills running on a more expensive model than needed.
 * Reads skill tier from .atta/team/model-registry.json, detects the current model
 * from the tool environment (Copilot: $COPILOT_MODEL, Cursor: stdin JSON model field,
 * Gemini: $GEMINI_MODEL), and compares against the skill's recommended tier.
 *
 * Behavior:
 *   - Blocks (exit 2) when the current model tier exceeds the skill's tier
 *   - Falls back to advisory warning when model can't be detected
 *   - --bypass flag in skill args skips the gate entirely
 *   - ATTA_MODEL_GATE=off env var disables the gate globally
 *
 * Claude Code is excluded — it handles model routing natively via model: frontmatter.
 */
export const MODEL_GATE_SCRIPT = `#!/bin/bash
# model-gate.sh — Block skills running on costlier models than needed
# Generated by Atta. Reads model-registry.json for tier + tool-specific model names.
# Detects the current model from the tool environment and blocks mismatches.
# Use --bypass in skill args or ATTA_MODEL_GATE=off to disable.
set -euo pipefail

# Global opt-out via env var
[ "\${ATTA_MODEL_GATE:-}" = "off" ] && exit 0

INPUT=$(cat)

# Extract skill name, args, and model (Cursor provides model in stdin JSON)
# Uses | delimiter to avoid word-splitting on spaces in args or model names
IFS='|' read -r SKILL ARGS STDIN_MODEL <<< "$(echo "\$INPUT" | python3 -c "
import json, sys
data = json.load(sys.stdin)
ti = data.get('tool_input', {})
skill = ''
args = ''
if isinstance(ti, dict):
    skill = ti.get('skill', '')
    args = ti.get('args', '')
elif 'toolArgs' in data:
    try:
        ta = json.loads(data['toolArgs'])
        skill = ta.get('skill', '')
        args = ta.get('args', '')
    except: pass
model = data.get('model', '')
print(f'{skill}|{args}|{model}')
" 2>/dev/null || echo "||")"

[ -z "\$SKILL" ] && exit 0

# Check for --bypass flag (exact word match to avoid substring false positives)
if echo " \$ARGS " | grep -qw -- '--bypass'; then
  exit 0
fi

# Detect which tool is running this hook
ADAPTER="\${ATTA_ADAPTER:-}"
if [ -z "\$ADAPTER" ]; then
  [ -d ".claude/skills" ] && ADAPTER="claude-code"
  [ -d ".github/skills" ] && ADAPTER="copilot"
  [ -d ".cursor/rules" ] && ADAPTER="cursor"
  [ -d ".gemini/commands" ] && ADAPTER="gemini"
fi

# Look up skill tier, recommended model name, and all tier model patterns from registry
REGISTRY=".atta/team/model-registry.json"
[ ! -f "\$REGISTRY" ] && exit 0

# Detect current model from the tool environment
CURRENT_MODEL=""
case "\$ADAPTER" in
  copilot)
    CURRENT_MODEL="\${COPILOT_MODEL:-}"
    ;;
  cursor)
    CURRENT_MODEL="\$STDIN_MODEL"
    ;;
  gemini)
    CURRENT_MODEL="\${GEMINI_MODEL:-}"
    ;;
esac

# All comparison logic in Python — avoids macOS sed issues and handles
# normalization of model slugs vs human-readable registry labels.
# Outputs: RESULT|TIER|MODEL_NAME|CURRENT_TIER
# RESULT is one of: block, allow, warn, skip
IFS='|' read -r RESULT TIER MODEL_NAME CURRENT_TIER <<< "$(REGISTRY="\$REGISTRY" SKILL="\$SKILL" ADAPTER="\$ADAPTER" CURRENT_MODEL="\$CURRENT_MODEL" python3 -c "
import json, os, re, sys

with open(os.environ['REGISTRY']) as f:
    reg = json.load(f)

skill = os.environ.get('SKILL', '')
tier = reg.get('skills', {}).get(skill, '')
if not tier:
    print('skip|||')
    sys.exit(0)

adapter = os.environ.get('ADAPTER', '') or 'claude-code'
model_name = reg.get('tiers', {}).get(tier, {}).get(adapter, tier)
current_model = os.environ.get('CURRENT_MODEL', '')

if not current_model:
    # Cannot detect model — advisory for light-tier skills only
    if tier == 'light':
        print(f'warn|{tier}|{model_name}|')
    else:
        print('skip|||')
    sys.exit(0)

# Normalize model string: lowercase, replace separators with spaces
def normalize(s):
    return re.sub(r'[-_./]', ' ', s.lower()).strip()

current_norm = normalize(current_model)

# Extract keyword patterns from registry model names.
# 'Claude Opus 4.6 or GPT-5.4' → ['opus', 'gpt 5 4']
# 'haiku' → ['haiku']
# We extract the distinctive model family word (opus, sonnet, haiku, gpt, flash, pro)
def extract_keywords(label):
    label_lower = label.lower()
    # Split on ' or ' for multi-option labels
    parts = label_lower.split(' or ')
    keywords = []
    for part in parts:
        norm = normalize(part)
        # Extract the key model identifier (opus, sonnet, haiku, flash, pro, gpt-X)
        for kw in ['opus', 'sonnet', 'haiku', 'flash']:
            if kw in norm:
                keywords.append(kw)
        # Also try the full normalized part for specific version matches
        keywords.append(norm)
    return keywords

# Determine current model tier by checking against registry tier labels
tier_rank = {'light': 1, 'mid': 2, 'full': 3}
current_tier = 'light'  # default: cheapest, won't block

for check_tier in ['full', 'mid']:
    label = reg.get('tiers', {}).get(check_tier, {}).get(adapter, '')
    if not label:
        continue
    keywords = extract_keywords(label)
    for kw in keywords:
        if kw and kw in current_norm:
            current_tier = check_tier
            break
    if current_tier != 'light':
        break

# Compare
current_rank = tier_rank.get(current_tier, 0)
skill_rank = tier_rank.get(tier, 0)

if current_rank > skill_rank:
    print(f'block|{tier}|{model_name}|{current_tier}')
else:
    print('allow|||')
" 2>/dev/null || echo "skip|||")"

case "\$RESULT" in
  block)
    echo "[model-gate] BLOCKED: /\$SKILL is a \$TIER-tier skill but you're running on \$CURRENT_MODEL (\$CURRENT_TIER tier)." >&2
    echo "[model-gate] Switch to \$MODEL_NAME or re-run with --bypass to override." >&2
    exit 2
    ;;
  warn)
    echo "[model-gate] /\$SKILL is a lightweight skill — consider using \$MODEL_NAME for cost savings." >&2
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
`;

/**
 * Write hook scripts to .atta/scripts/hooks/ in the target project.
 * Called by adapters that need command-type hooks (Copilot, Cursor, Gemini).
 *
 * @param {string} targetDir - Project root
 * @returns {number} Number of scripts written
 */
export function writeHookScripts(targetDir) {
  const hooksDir = join(targetDir, '.atta', 'scripts', 'hooks');
  mkdirSync(hooksDir, { recursive: true });

  // Always overwrite — keep scripts in sync with hooks.json (which is also always regenerated)
  writeFileSync(join(hooksDir, 'pre-bash-safety.sh'), PRE_BASH_SAFETY_SCRIPT, { mode: 0o755 });
  writeFileSync(join(hooksDir, 'stop-quality-gate.sh'), STOP_QUALITY_GATE_SCRIPT, { mode: 0o755 });
  writeFileSync(join(hooksDir, 'model-gate.sh'), MODEL_GATE_SCRIPT, { mode: 0o755 });

  return 3;
}

// ─── Frontmatter Parsing ─────────────────────────────────────────────

/**
 * Parse YAML frontmatter from an agent markdown file.
 * Handles key-value pairs, block lists (  - item), inline flow lists ([a, b]),
 * and scalar type conversion (booleans, numbers). Multiline YAML values are
 * rejected with a clear error rather than silently truncated.
 *
 * @param {string} content - Full markdown content with optional frontmatter
 * @returns {{ frontmatter: Object<string, string|string[]|boolean|number>, body: string }}
 * @throws {Error} If frontmatter contains multiline YAML, orphan list items, or malformed lines
 */
export function parseAgentFrontmatter(content) {
  // Normalize CRLF → LF for cross-platform compatibility (Windows-edited files)
  const normalized = content.replace(/\r\n/g, '\n');

  // Trailing body is optional — frontmatter-only agent files are valid
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n([\s\S]*))?$/);
  if (!match) {
    // Detect unterminated frontmatter — file starts with `---` but has no closing fence
    if (normalized.startsWith('---\n') || normalized === '---') {
      throw new Error(
        'Unterminated or malformed agent frontmatter: missing closing "---" fence.'
      );
    }
    return { frontmatter: {}, body: normalized };
  }

  const fm = {};
  const fmLines = match[1].split('\n');
  let currentKey = null;

  for (let i = 0; i < fmLines.length; i++) {
    const line = fmLines[i];
    // Skip empty lines and YAML comments
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // YAML list item (  - value) — append to current key's array
    // Only valid if the current key was declared as an array (empty value after colon)
    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch) {
      if (currentKey && Array.isArray(fm[currentKey])) {
        const itemValue = listMatch[1].trim();
        // Strip quotes from list items
        const qm = itemValue.match(/^(['"])(.*)\1$/);
        fm[currentKey].push(qm ? qm[2] : itemValue);
        continue;
      }
      throw new Error(
        `Orphan list item in agent frontmatter: "${line.trim()}". ` +
        `List items must follow a key declared as an array (e.g., "tools:" on its own line).`
      );
    }

    const kvMatch = line.match(/^([\w][\w-]*)\s*:\s*(.*)$/);
    if (!kvMatch) {
      throw new Error(
        `Malformed agent frontmatter line: "${line}". ` +
        `Only key: value pairs and list items (  - value) are supported.`
      );
    }

    currentKey = kvMatch[1];
    const value = kvMatch[2].trim();

    // Detect multiline YAML block indicators — fail fast instead of silent truncation
    if (/^[>|][+-]?$/.test(value)) {
      throw new Error(
        `Unsupported multiline YAML value for "${kvMatch[1]}" (found "${value}"). ` +
        `Agent frontmatter only supports single-line values and lists.`
      );
    }

    // Empty value after colon — next lines may be list items
    if (!value) {
      fm[currentKey] = [];
      continue;
    }

    // Inline flow list: key: [a, b, c]
    const flowListMatch = value.match(/^\[(.*)\]$/);
    if (flowListMatch) {
      fm[currentKey] = flowListMatch[1]
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => {
          const qm = item.match(/^(['"])(.*)\1$/);
          return qm ? qm[2] : item;
        });
      continue;
    }

    // Strip surrounding quotes and unescape if present (both single and double)
    const quoteMatch = value.match(/^(['"])(.*)\1$/);
    if (quoteMatch) {
      let inner = quoteMatch[2];
      // Double-quoted values: unescape \" and \\ (matches yamlQuoteIfNeeded output)
      if (quoteMatch[1] === '"') {
        inner = inner.replace(/\\(["\\])/g, '$1');
      }
      fm[currentKey] = inner;
    } else {
      // Convert YAML scalars: booleans and numbers (ensures round-trip with serializeFrontmatter)
      fm[currentKey] = convertYamlScalar(value);
    }
  }

  return { frontmatter: fm, body: match[2] || '' };
}

/**
 * Serialize a frontmatter object back to YAML fences.
 * Values containing YAML-significant characters are double-quoted.
 *
 * @param {Object<string, string|string[]|boolean|number>} fm - Frontmatter key-value pairs (supports arrays, booleans, numbers)
 * @returns {string} YAML frontmatter block (with --- delimiters)
 */
function serializeFrontmatter(fm) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fm)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${yamlQuoteIfNeeded(item)}`);
        }
      }
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      // Booleans and numbers are emitted unquoted (YAML native types)
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${yamlQuoteIfNeeded(value)}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

/**
 * Quote a YAML scalar value if it contains characters that would be
 * misinterpreted by a YAML parser (colon-space, space-hash, indicator
 * chars, boolean/null literals, leading/trailing whitespace, or is empty).
 */
/**
 * Convert unquoted YAML scalar strings to native JS types.
 * Handles booleans (true/false/yes/no) and numbers.
 * Returns the original string if no conversion applies.
 */
function convertYamlScalar(value) {
  if (/^(true|yes|on)$/i.test(value)) return true;
  if (/^(false|no|off)$/i.test(value)) return false;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  return value;
}

function yamlQuoteIfNeeded(value) {
  if (value === undefined || value === null) return '""';
  const str = String(value);
  if (
    str === '' ||
    str !== str.trim() ||
    /: /.test(str) || /:$/.test(str) ||
    / #/.test(str) ||
    /^[!&*'"@`|>{}\[\],%?-]/.test(str) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(str)
  ) {
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return str;
}

// ─── Skill Conflict Detection ────────────────────────────────────────

/**
 * Known built-in commands per tool that would conflict with custom skills.
 * A conflicting name can silently break ALL custom commands in some tools
 * (e.g., Claude Code — see GitHub issue #13586).
 *
 * Lists are intentionally minimal — only commands confirmed to cause conflicts.
 * Atta skills use the atta-* prefix which avoids most collisions.
 */
const BUILTIN_COMMANDS = {
  'claude-code': new Set([
    'help', 'clear', 'compact', 'model', 'cost', 'status', 'login', 'logout',
    'config', 'permissions', 'doctor', 'bug', 'init', 'review', 'memory',
    'skill', 'agent', 'hooks', 'mcp', 'listen', 'vim', 'fast',
  ]),
  copilot: new Set([
    'help', 'clear', 'review', 'agent', 'update', 'test', 'fix', 'explain',
    'doc', 'generate', 'workspace', 'terminal',
  ]),
  cursor: new Set([
    'help', 'clear', 'review', 'chat', 'edit', 'generate', 'fix', 'explain',
    'doc', 'test', 'terminal', 'web',
  ]),
  codex: new Set([
    'help', 'clear', 'model', 'approval', 'history',
  ]),
  gemini: new Set([
    'help', 'clear', 'chat', 'memory', 'stats', 'tools', 'compress',
    'restore', 'save',
  ]),
};

/**
 * Check for naming conflicts between custom skills and tool built-in commands.
 * Emits non-blocking warnings to console. Does not prevent init.
 *
 * @param {Array<{name: string, dirName: string}>} skills - Skills from listSkills()
 * @param {'claude-code'|'copilot'|'cursor'|'gemini'|'codex'} adapter - Target adapter
 * @param {object} [options]
 * @param {boolean} [options.quiet] - Suppress output
 * @returns {string[]} Array of conflicting skill names (empty if none)
 */
export function checkSkillConflicts(skills, adapter, options = {}) {
  const builtins = BUILTIN_COMMANDS[adapter];
  if (!builtins) return [];

  const conflicts = [];
  for (const skill of skills) {
    // Check both the directory name and the name field (may differ)
    const namesToCheck = new Set([skill.dirName, skill.name]);
    for (const name of namesToCheck) {
      if (builtins.has(name)) {
        conflicts.push(name);
        if (!options.quiet) {
          console.warn(
            `  ${pc.yellow('⚠')} Skill "${name}" conflicts with ${adapter} built-in "/${name}" — may shadow built-in command`
          );
        }
      }
    }
  }

  return conflicts;
}

// ─── Skill Frontmatter Field Sets ────────────────────────────────────

/**
 * Frontmatter fields preserved per adapter when installing SKILL.md files.
 * Fields outside these sets are stripped during install to avoid
 * validator warnings (Copilot) or noise (Codex).
 *
 * Claude Code: no filtering needed (source IS the install, all fields native)
 * Cursor: uses MDC conversion (all frontmatter stripped, NL embedding instead)
 * Gemini: uses TOML conversion (all frontmatter stripped, NL embedding instead)
 */

/** Copilot: name, description, license (spec), disable-model-invocation, user-invocable (runtime) */
export const COPILOT_SKILL_FIELDS = new Set([
  'name', 'description', 'license',
  'disable-model-invocation', 'user-invocable',
]);

/** Cursor: Agent Skills spec fields (strict validation rejects unknown fields) */
export const CURSOR_SKILL_FIELDS = new Set([
  'name', 'description', 'license',
  'allowed-tools', 'metadata', 'model',
  'disable-model-invocation', 'user-invocable',
]);

/** Codex: only reads name + description from SKILL.md frontmatter */
export const CODEX_SKILL_FIELDS = new Set(['name', 'description']);

// ─── Skill Frontmatter Filtering ─────────────────────────────────────

/**
 * Filter SKILL.md frontmatter to only include fields supported by a specific adapter.
 * Takes the raw frontmatter block (including --- delimiters) and returns a filtered version.
 *
 * @param {string} frontmatterBlock - Raw frontmatter including --- delimiters and trailing newline
 * @param {Set<string>} allowedFields - Set of field names to preserve
 * @returns {string} Filtered frontmatter block with --- delimiters
 */
export function filterSkillFrontmatter(frontmatterBlock, allowedFields) {
  const lines = frontmatterBlock.split('\n');
  const filtered = ['---'];

  for (const line of lines) {
    if (line === '---' || line.trim() === '') continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    if (allowedFields.has(key)) {
      filtered.push(line);
    }
  }

  filtered.push('---');
  return filtered.join('\n') + '\n';
}

// ─── File Operations ─────────────────────────────────────────────────

/**
 * Copy agent definition .md files from framework source to target directory.
 * Copies core agents, coordinators, and specialists.
 * Optionally transforms frontmatter and body per adapter.
 *
 * @param {string} claudeRoot - Path to .claude/ source (agents live here)
 * @param {string} destAgentsDir - Target directory for agent files
 * @param {object} [options] - Options
 * @param {boolean} [options.quiet] - Suppress console output
 * @param {string} [options.extension='.md'] - Output file extension (e.g., '.agent.md' for Copilot)
 * @param {function} [options.transformFrontmatter] - Transform frontmatter object before writing
 * @param {function} [options.transformBody] - Transform body text before writing
 * @param {string[]} [options.selectedAgents] - Agent IDs to install (filters root agents). If omitted, all agents are copied.
 * @returns {number} Number of files copied
 */
export function copyAgentFiles(claudeRoot, destAgentsDir, options = {}) {
  const { extension = '.md', transformFrontmatter, transformBody, selectedAgents } = options;
  const srcAgentsDir = join(claudeRoot, 'agents');
  if (!existsSync(srcAgentsDir)) return 0;

  const hasTransform = transformFrontmatter || transformBody || extension !== '.md';
  let count = 0;

  /**
   * Process a single agent file: copy verbatim or transform frontmatter/body.
   */
  function processFile(srcPath, destDir, fileName) {
    const baseName = fileName.replace(/\.md$/, '');
    const destFileName = baseName + extension;
    const destPath = join(destDir, destFileName);

    mkdirSync(destDir, { recursive: true });

    if (!hasTransform) {
      cpSync(srcPath, destPath);
    } else {
      const content = readFileSync(srcPath, 'utf-8');
      const { frontmatter, body } = parseAgentFrontmatter(content);

      const newFm = transformFrontmatter ? transformFrontmatter(frontmatter) : frontmatter;
      const newBody = transformBody ? transformBody(body) : body;

      writeFileSync(destPath, serializeFrontmatter(newFm) + '\n' + newBody);
    }
    count++;
  }

  // Root agents (core + optional .md files, skip INDEX, README, and subdirectories)
  // When selectedAgents is provided, only copy agents in the list
  const rootFiles = readdirSync(srcAgentsDir, { withFileTypes: true })
    .filter(
      (f) =>
        f.isFile() &&
        f.name.endsWith('.md') &&
        f.name !== 'INDEX.md' &&
        f.name !== 'README.md' &&
        (!selectedAgents || selectedAgents.includes(f.name.replace(/\.md$/, '')))
    );

  for (const file of rootFiles) {
    processFile(join(srcAgentsDir, file.name), destAgentsDir, file.name);
  }

  // Remove stale framework-provided root agents from destination that are no longer selected
  // (handles re-init with a narrower agent selection)
  // Only delete agents that exist in the framework source — never touch user-created custom agents
  if (selectedAgents && existsSync(destAgentsDir)) {
    const frameworkAgentIds = new Set(
      readdirSync(srcAgentsDir, { withFileTypes: true })
        .filter((f) => f.isFile() && f.name.endsWith('.md') && f.name !== 'INDEX.md' && f.name !== 'README.md')
        .map((f) => f.name.replace(/\.md$/, ''))
    );
    const existingFiles = readdirSync(destAgentsDir, { withFileTypes: true })
      .filter(
        (f) =>
          f.isFile() &&
          f.name.endsWith(extension) &&
          f.name !== 'INDEX.md' &&
          f.name !== 'README.md'
      );
    for (const file of existingFiles) {
      const agentId = file.name.slice(0, -extension.length);
      if (frameworkAgentIds.has(agentId) && !selectedAgents.includes(agentId)) {
        unlinkSync(join(destAgentsDir, file.name));
      }
    }
  }

  // Coordinators
  const coordDir = join(srcAgentsDir, 'coordinators');
  if (existsSync(coordDir)) {
    const coordFiles = readdirSync(coordDir).filter(
      (f) => f.endsWith('.md') && f !== 'README.md'
    );
    for (const file of coordFiles) {
      processFile(join(coordDir, file), join(destAgentsDir, 'coordinators'), file);
    }
  }

  // Specialists
  const specDir = join(srcAgentsDir, 'specialists');
  if (existsSync(specDir)) {
    const specFiles = readdirSync(specDir).filter(
      (f) => f.endsWith('.md') && f !== 'README.md'
    );
    for (const file of specFiles) {
      processFile(join(specDir, file), join(destAgentsDir, 'specialists'), file);
    }
  }

  return count;
}

/**
 * List canonical agent files from .claude/agents/ with parsed frontmatter.
 * Returns flat array of { name, description, fileName } for all root agents (core + optional).
 * Used by adapters that need to generate tool-specific agent configs (e.g., Codex TOML).
 *
 * @param {string} claudeRoot - Path to .claude/ source
 * @param {object} [options]
 * @param {string[]} [options.selectedAgents] - Agent IDs to include. If omitted, all agents are returned.
 * @returns {Array<{ name: string, description: string, fileName: string }>}
 */
export function listAgentDefs(claudeRoot, options = {}) {
  const { selectedAgents } = options;
  const srcAgentsDir = join(claudeRoot, 'agents');
  if (!existsSync(srcAgentsDir)) return [];

  const agents = [];
  const rootFiles = readdirSync(srcAgentsDir, { withFileTypes: true })
    .filter(
      (f) =>
        f.isFile() &&
        f.name.endsWith('.md') &&
        f.name !== 'INDEX.md' &&
        f.name !== 'README.md' &&
        (!selectedAgents || selectedAgents.includes(f.name.replace(/\.md$/, '')))
    );

  for (const file of rootFiles) {
    const content = readFileSync(join(srcAgentsDir, file.name), 'utf-8');
    const { frontmatter } = parseAgentFrontmatter(content);
    agents.push({
      name: frontmatter.name || file.name.replace(/\.md$/, ''),
      description: frontmatter.description || '',
      fileName: file.name,
    });
  }

  return agents;
}

/**
 * Copy bootstrap directory to .atta/bootstrap/ in the target project.
 * This makes detection YAML, agent templates, and mappings available
 * to the /atta skill regardless of which AI tool runs it.
 *
 * @param {string} attaRoot - Path to .atta/ source (bootstrap lives here)
 * @param {string} targetDir - Project root where .atta/bootstrap/ will be created
 * @param {object} [options] - Options (quiet: boolean)
 * @returns {number} Number of files copied
 */
export function copyBootstrap(attaRoot, targetDir, options = {}) {
  const srcBootstrap = join(attaRoot, 'bootstrap');
  if (!existsSync(srcBootstrap)) return 0;

  const destBootstrap = join(targetDir, '.atta', 'bootstrap');
  mkdirSync(destBootstrap, { recursive: true });

  // Recursive copy of entire bootstrap directory
  cpSync(srcBootstrap, destBootstrap, { recursive: true });

  // Count files for reporting
  const count = countFiles(destBootstrap);

  if (!options.quiet && count > 0) {
    console.log(
      `  ${pc.green('✓')} .atta/bootstrap/ (${count} files — detection, templates, mappings)`
    );
  }

  return count;
}

/**
 * User-owned files per shared directory — never overwritten on re-run.
 * Paths are relative to their respective directory inside .atta/.
 */
const USER_OWNED_FILES = {
  // local/ is not in SHARED_DIRS (copied via SHARED_FILES instead).
  // developer-profile.md is protected by init.js (only written if absent).
  project: new Set(['project-context.md', 'project-profile.md']),
  // team/ files that /atta generates or users customize — don't overwrite on re-init.
  team: new Set(['quick-reference.md', 'templates/pr-template.md']),
};

/** Shared directories to copy from .atta/ source to .atta/ in the target */
const SHARED_DIRS = [
  'team',
  'project',
  'scripts',
  '.metadata',
  // Note: 'docs' intentionally excluded — Atta meta-docs don't ship to user projects.
  // Users can read them at https://github.com/nicholasgasior/atta-dev
];

/** Individual shared files to copy to .atta/local/ */
const SHARED_FILES = [
  'local/sessions/schema.json',
  'local/sessions/README.md',
  'local/sessions/TRACKING_GUIDE.md',
  'local/sessions/SKILL_TEMPLATE.md',
  'local/sessions/INTEGRATION_EXAMPLE.md',
  'local/context/README.md',
];

/**
 * Copy shared (tool-agnostic) content from .atta/ source to .atta/ in the target project.
 * Copies team content, scripts, metadata, and local templates. Does not copy docs.
 *
 * @param {string} attaRoot - Path to .atta/ source
 * @param {string} targetDir - Project root where .atta/ will be populated
 * @param {object} [options] - Options (quiet: boolean)
 * @returns {number} Number of files copied
 */
export function copySharedContent(attaRoot, targetDir, options = {}) {
  const destAttaDir = join(targetDir, '.atta');
  let totalCount = 0;

  for (const dir of SHARED_DIRS) {
    const src = join(attaRoot, dir);
    const dest = join(destAttaDir, dir);
    if (!existsSync(src)) continue;

    mkdirSync(dest, { recursive: true });

    if (USER_OWNED_FILES[dir]) {
      // Preserve user-owned files that may have been customized after initial install.
      cpSync(src, dest, {
        recursive: true,
        filter: (srcPath, destPath) => {
          if (lstatSync(srcPath).isDirectory()) return true;
          const rel = relative(src, srcPath);
          return USER_OWNED_FILES[dir].has(rel) ? !existsSync(destPath) : true;
        },
      });
    } else {
      cpSync(src, dest, { recursive: true });
    }
    const count = countFiles(dest);
    totalCount += count;

    if (!options.quiet) {
      console.log(`  ${pc.green('✓')} .atta/${dir}/ (${count} files)`);
    }
  }

  for (const file of SHARED_FILES) {
    const src = join(attaRoot, file);
    if (!existsSync(src)) continue;

    const dest = join(destAttaDir, file);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
    totalCount++;
  }

  if (!options.quiet && SHARED_FILES.length > 0) {
    console.log(`  ${pc.green('✓')} .atta/local/ (sessions schema + context template)`);
  }

  return totalCount;
}

/**
 * Rewrite Claude Code-specific content in a skill body for non-Claude adapters.
 * Applied at install time — source files are never modified.
 *
 * @param {string} body - Skill body text (after frontmatter removal)
 * @param {object} config - Adapter-specific rewrite configuration
 * @param {string} config.agentsPath - Agent directory path (e.g., '.github/atta/agents', '.agents/agents')
 * @param {string} config.memoryPath - Memory directory path (e.g., '.github/atta/agents/memory')
 * @param {Object<string,string>} [config.commandMap] - Map of original→rewritten commands (e.g., { review: '/atta-review' })
 * @param {boolean} [config.resolveAttaPlaceholders=false] - Resolve {attaDir}/{agentsDir}/{bootstrapDir}/{teamDir}/{localDir}/{metadataDir} to literal paths
 * @returns {string} Rewritten skill body
 */
export function rewriteSkillBody(body, config) {
  const {
    agentsPath,
    memoryPath,
    commandMap = {},
    resolveAttaPlaceholders = false,
  } = config;

  let result = body;

  // 1. Replace .claude/agents/memory/ → adapter memory path (with and without trailing slash)
  result = result.replace(/\.claude\/agents\/memory\//g, `${memoryPath}/`);
  result = result.replace(/\.claude\/agents\/memory(?=[`\s]|$)/g, memoryPath);

  // 2. Replace .claude/agents/ → adapter agents path (after memory, to avoid double-replace)
  result = result.replace(/\.claude\/agents\//g, `${agentsPath}/`);
  result = result.replace(/\.claude\/agents(?=[`\s]|$)/g, agentsPath);

  // 3. Replace slash-command references: `/atta-review`, `/atta-agent`, etc.
  //    Use capturing group for prefix instead of lookbehind (valid across all Node versions)
  for (const [original, replacement] of Object.entries(commandMap)) {
    const pattern = new RegExp(
      '(^|[`\\s(|])\\/' + escapeRegex(original) + '(?=[`\\s),.|]|$)',
      'gm'
    );
    result = result.replace(pattern, (_match, prefix) => (prefix || '') + replacement);
  }

  // 4. Replace AskUserQuestion with plain conversational pattern
  result = result.replace(
    /(?:Then )?[Uu]se AskUserQuestion[^.]*\./g,
    'Ask the user in one short message.'
  );
  result = result.replace(
    /Ask (?:questions )?using AskUserQuestion[^.]*\./g,
    'Ask the user up to 3 short questions in one message.'
  );
  result = result.replace(
    /AskUserQuestion(?:\s*\([^)]*\))?/g,
    'a plain conversational question'
  );

  // 5. Replace Task tool / run_in_background references
  result = result.replace(
    /spawn a Task tool subagent[^.)]*\)?/g,
    'run the specialist pass (sequentially if parallel execution is not supported)'
  );
  result = result.replace(
    /Task tool/g,
    'specialist execution'
  );
  result = result.replace(
    /`?run_in_background:\s*true`?/g,
    '(parallel if supported, otherwise sequential)'
  );

  // 6. Resolve {attaDir}, {agentsDir}, {bootstrapDir} placeholders (for Gemini TOML — static, no AI resolves them)
  if (resolveAttaPlaceholders) {
    result = result.replace(/\{attaDir\}/g, '.atta');
    result = result.replace(/\{agentsDir\}/g, agentsPath);
    result = result.replace(/\{bootstrapDir\}/g, '.atta/bootstrap');
    result = result.replace(/\{knowledgeDir\}/g, '.atta/team');
    result = result.replace(/\{teamDir\}/g, '.atta/team');
    result = result.replace(/\{localDir\}/g, '.atta/local');
    result = result.replace(/\{metadataDir\}/g, '.atta/.metadata');
  }

  return result;
}

/** Escape special regex characters in a string */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a memory directory with empty directives.md placeholder.
 * Called by non-Claude adapters during install.
 *
 * @param {string} agentsDir - Target agents directory (e.g., join(targetDir, '.github', 'atta', 'agents'))
 * @param {object} [options] - Options (quiet: boolean)
 */
export function createMemoryDirectory(agentsDir, options = {}) {
  const memoryDir = join(agentsDir, 'memory');
  mkdirSync(memoryDir, { recursive: true });

  const directivesPath = join(memoryDir, 'directives.md');
  if (!existsSync(directivesPath)) {
    writeFileSync(directivesPath, [
      '# Directives Memory',
      '',
      '> Captures user preferences, rules, and decisions across sessions.',
      '> Updated by the Librarian agent.',
      '',
      '---',
      '',
    ].join('\n'));
  }

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} ${relative(join(agentsDir, '..', '..'), memoryDir) || 'memory'}/ (directives placeholder)`);
  }
}

/**
 * Recursively count visible files in a directory (skips dotfiles like .gitignore, .gitkeep).
 * Used for user-facing install summaries. See also fs-utils.js countFiles() which counts all files.
 */
function countFiles(dir) {
  let count = 0;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && !entry.name.startsWith('.')) {
      count++;
    } else if (entry.isDirectory()) {
      count += countFiles(join(dir, entry.name));
    }
  }
  return count;
}

// ─── Cross-Tool Name Mappings ───────────────────────────────────────

/**
 * Map Claude Code tool names to Copilot tool names.
 * Verified against GitHub docs (copilot/reference/custom-agents-configuration.md).
 * Copilot accepts aliases case-insensitively; this map uses exact CC tool names as keys.
 *
 * @param {string[]|string} tools - Claude Code tool names
 * @returns {string[]} Copilot tool names (deduplicated)
 */
export function mapToolsToCopilot(tools) {
  const CC_TO_COPILOT = {
    Read: 'read', Edit: 'edit', Write: 'edit',
    Grep: 'search', Glob: 'search', Bash: 'execute', Agent: 'agent',
  };
  const list = Array.isArray(tools) ? tools : tools.split(/,\s*/);
  const mapped = new Set();
  for (const tool of list) {
    const name = CC_TO_COPILOT[tool.trim()];
    if (name) mapped.add(name);
  }
  return [...mapped];
}

/**
 * Map Claude Code tool names to Gemini tool names.
 * Verified against gemini-cli docs (docs/tools/file-system.md, docs/tools/shell.md).
 *
 * @param {string[]|string} tools - Claude Code tool names
 * @returns {string[]} Gemini tool names (deduplicated)
 */
export function mapToolsToGemini(tools) {
  const CC_TO_GEMINI = {
    Read: 'read_file', Edit: 'replace', Write: 'write_file',
    Grep: 'grep_search', Glob: 'glob', Bash: 'run_shell_command',
  };
  const list = Array.isArray(tools) ? tools : tools.split(/,\s*/);
  const mapped = new Set();
  for (const tool of list) {
    const name = CC_TO_GEMINI[tool.trim()];
    if (name) mapped.add(name);
  }
  return [...mapped];
}
