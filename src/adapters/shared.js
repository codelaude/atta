import { existsSync, mkdirSync, cpSync, lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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

  // Post-edit lint hook (when linter detected)
  const lintCmd = detectLintCommand(detectedTechs);
  if (lintCmd) {
    hooks[HOOK_EVENT_MAP.postToolUse.cursor] = [
      { type: 'command', command: lintCmd, timeout: 30 },
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
  *"| sh"*|*"| bash"*|*"curl"*"| "*"sh"*|*"wget"*"| "*"sh"*|*"wget"*"| "*"bash"*)
    BLOCKED="Piping remote content to shell is unsafe" ;;
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
 * Lightweight check that echoes a reminder to the agent.
 */
export const STOP_QUALITY_GATE_SCRIPT = `#!/bin/bash
# stop-quality-gate.sh — Lightweight completion check
# Generated by Atta. Runs on agent stop to remind about task completion.
set -euo pipefail

# This is a passive hook — it logs a reminder but does not block.
# For AI-powered quality gates, use Claude Code or Cursor (prompt type hooks).
exit 0
`;

/**
 * Write hook scripts to .atta/scripts/hooks/ in the target project.
 * Called by adapters that need command-type hooks (Copilot, Gemini).
 *
 * @param {string} targetDir - Project root
 * @returns {number} Number of scripts written
 */
export function writeHookScripts(targetDir) {
  const hooksDir = join(targetDir, '.atta', 'scripts', 'hooks');
  mkdirSync(hooksDir, { recursive: true });

  let count = 0;

  const safetyPath = join(hooksDir, 'pre-bash-safety.sh');
  if (!existsSync(safetyPath)) {
    writeFileSync(safetyPath, PRE_BASH_SAFETY_SCRIPT, { mode: 0o755 });
    count++;
  }

  const gatePath = join(hooksDir, 'stop-quality-gate.sh');
  if (!existsSync(gatePath)) {
    writeFileSync(gatePath, STOP_QUALITY_GATE_SCRIPT, { mode: 0o755 });
    count++;
  }

  return count;
}

// ─── Frontmatter Parsing ─────────────────────────────────────────────

/**
 * Parse YAML frontmatter from an agent markdown file.
 * Handles flat key-value pairs only — multiline YAML values are rejected
 * with a clear error rather than silently truncated.
 *
 * @param {string} content - Full markdown content with optional frontmatter
 * @returns {{ frontmatter: Object<string,string>, body: string }}
 * @throws {Error} If frontmatter contains multiline YAML or malformed lines
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
  for (const line of match[1].split('\n')) {
    // Skip empty lines and YAML comments
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const kvMatch = line.match(/^([\w][\w-]*)\s*:\s*(.*)$/);
    if (!kvMatch) {
      throw new Error(
        `Malformed agent frontmatter line: "${line}". ` +
        `Only single-line key: value pairs are supported.`
      );
    }

    const value = kvMatch[2].trim();

    // Detect multiline YAML block indicators — fail fast instead of silent truncation
    if (/^[>|][+-]?$/.test(value)) {
      throw new Error(
        `Unsupported multiline YAML value for "${kvMatch[1]}" (found "${value}"). ` +
        `Agent frontmatter only supports single-line key: value pairs.`
      );
    }

    // Strip surrounding quotes and unescape if present (both single and double)
    const quoteMatch = value.match(/^(['"])(.*)\1$/);
    if (quoteMatch) {
      let inner = quoteMatch[2];
      // Double-quoted values: unescape \" and \\ (matches yamlQuoteIfNeeded output)
      if (quoteMatch[1] === '"') {
        inner = inner.replace(/\\(["\\])/g, '$1');
      }
      fm[kvMatch[1]] = inner;
    } else {
      fm[kvMatch[1]] = value;
    }
  }

  return { frontmatter: fm, body: match[2] || '' };
}

/**
 * Serialize a frontmatter object back to YAML fences.
 * Values containing YAML-significant characters are double-quoted.
 *
 * @param {Object<string,string>} fm - Frontmatter key-value pairs
 * @returns {string} YAML frontmatter block (with --- delimiters)
 */
function serializeFrontmatter(fm) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fm)) {
    lines.push(`${key}: ${yamlQuoteIfNeeded(value)}`);
  }
  lines.push('---');
  return lines.join('\n');
}

/**
 * Quote a YAML scalar value if it contains characters that would be
 * misinterpreted by a YAML parser (colon-space, space-hash, indicator
 * chars, boolean/null literals, leading/trailing whitespace, or is empty).
 */
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
 * @returns {number} Number of files copied
 */
export function copyAgentFiles(claudeRoot, destAgentsDir, options = {}) {
  const { extension = '.md', transformFrontmatter, transformBody } = options;
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

  // Core agents (root .md files, skip INDEX, README, and subdirectories)
  const rootFiles = readdirSync(srcAgentsDir, { withFileTypes: true })
    .filter(
      (f) =>
        f.isFile() &&
        f.name.endsWith('.md') &&
        f.name !== 'INDEX.md' &&
        f.name !== 'README.md'
    );

  for (const file of rootFiles) {
    processFile(join(srcAgentsDir, file.name), destAgentsDir, file.name);
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
 * Returns flat array of { name, description, fileName } for all core agents.
 * Used by adapters that need to generate tool-specific agent configs (e.g., Codex TOML).
 *
 * @param {string} claudeRoot - Path to .claude/ source
 * @returns {Array<{ name: string, description: string, fileName: string }>}
 */
export function listAgentDefs(claudeRoot) {
  const srcAgentsDir = join(claudeRoot, 'agents');
  if (!existsSync(srcAgentsDir)) return [];

  const agents = [];
  const rootFiles = readdirSync(srcAgentsDir, { withFileTypes: true })
    .filter(
      (f) =>
        f.isFile() &&
        f.name.endsWith('.md') &&
        f.name !== 'INDEX.md' &&
        f.name !== 'README.md'
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
