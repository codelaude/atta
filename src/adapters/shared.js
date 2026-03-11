import { existsSync, mkdirSync, cpSync, lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import pc from 'picocolors';

/**
 * Shared utilities for all adapters.
 */

/**
 * Cross-tool hook event mapping.
 * Documents equivalent event names across all 5 tools with hook support.
 * Used by adapters and plugin generators to emit the correct event names.
 *
 * Event counts: Claude Code 17, Cursor 19+, Gemini 12, Copilot 6, Codex 2 (approval only).
 *
 * @type {Object<string, Object<string, string|null>>}
 */
export const HOOK_EVENT_MAP = {
  // Session lifecycle
  sessionStart:       { 'claude-code': 'SessionStart',       copilot: 'sessionStart',        cursor: 'sessionStart',         gemini: 'SessionStart',      codex: null },
  sessionEnd:         { 'claude-code': 'SessionEnd',         copilot: 'sessionEnd',          cursor: 'sessionEnd',           gemini: 'SessionEnd',        codex: null },
  stop:               { 'claude-code': 'Stop',               copilot: null,                  cursor: 'stop',                 gemini: null,                codex: 'after_agent' },
  // Tool lifecycle
  preToolUse:         { 'claude-code': 'PreToolUse',         copilot: 'preToolUse',          cursor: 'preToolUse',           gemini: 'BeforeTool',        codex: null },
  postToolUse:        { 'claude-code': 'PostToolUse',        copilot: 'postToolUse',         cursor: 'postToolUse',          gemini: 'AfterTool',         codex: 'after_tool_use' },
  postToolUseFailure: { 'claude-code': 'PostToolUseFailure', copilot: 'errorOccurred',       cursor: 'postToolUseFailure',   gemini: null,                codex: null },
  // User interaction
  userPromptSubmit:   { 'claude-code': 'UserPromptSubmit',   copilot: 'userPromptSubmitted', cursor: 'beforeSubmitPrompt',    gemini: null,                codex: null },
  // Agent lifecycle
  subagentStart:      { 'claude-code': 'SubagentStart',      copilot: null,                  cursor: 'subagentStart',        gemini: 'BeforeAgent',       codex: null },
  subagentStop:       { 'claude-code': 'SubagentStop',       copilot: null,                  cursor: 'subagentStop',         gemini: 'AfterAgent',        codex: null },
  // Context management
  preCompact:         { 'claude-code': 'PreCompact',         copilot: null,                  cursor: 'preCompact',           gemini: 'PreCompress',       codex: null },
  notification:       { 'claude-code': 'Notification',       copilot: null,                  cursor: null,                   gemini: 'Notification',      codex: null },
  // Cursor-only file events
  afterFileEdit:      { 'claude-code': null,                 copilot: null,                  cursor: 'afterFileEdit',        gemini: null,                codex: null },
  beforeShellExec:    { 'claude-code': null,                 copilot: null,                  cursor: 'beforeShellExecution', gemini: null,                codex: null },
  // Claude Code-only events
  permissionRequest:  { 'claude-code': 'PermissionRequest',  copilot: null,                  cursor: null,                   gemini: null,                codex: null },
  configChange:       { 'claude-code': 'ConfigChange',       copilot: null,                  cursor: null,                   gemini: null,                codex: null },
  // Gemini-only events
  beforeModel:        { 'claude-code': null,                 copilot: null,                  cursor: null,                   gemini: 'BeforeModel',       codex: null },
  afterModel:         { 'claude-code': null,                 copilot: null,                  cursor: null,                   gemini: 'AfterModel',        codex: null },
};

/**
 * Generate a hooks.json config for a specific adapter.
 * Returns placeholder hooks with the adapter's native event names.
 * Claude Code generates its own hooks (session-track.sh); this is for other adapters.
 *
 * @param {'copilot'|'cursor'|'gemini'} adapter - Target adapter
 * @returns {object} hooks.json content ready to serialize
 */
export function generateHooksConfig(adapter) {
  if (adapter === 'copilot') {
    // Copilot: 6 events, command hooks only (versioned schema for forward compat)
    return {
      version: 1,
      hooks: {
        sessionStart: [],
        sessionEnd: [],
        preToolUse: [],
        postToolUse: [],
        errorOccurred: [],
        userPromptSubmitted: [],
      },
    };
  }

  if (adapter === 'cursor') {
    // Cursor: 19+ events, command + prompt hooks
    return {
      hooks: {
        sessionStart: [],
        sessionEnd: [],
        stop: [],
        preToolUse: [],
        postToolUse: [],
        afterFileEdit: [],
        beforeShellExecution: [],
        subagentStart: [],
        subagentStop: [],
        preCompact: [],
      },
    };
  }

  if (adapter === 'gemini') {
    // Gemini: 12 events, JSON stdin/stdout hooks
    return {
      hooks: {
        SessionStart: [],
        SessionEnd: [],
        BeforeTool: [],
        AfterTool: [],
        BeforeAgent: [],
        AfterAgent: [],
        BeforeModel: [],
        AfterModel: [],
        Notification: [],
        PreCompress: [],
      },
    };
  }

  return { hooks: {} };
}

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
  knowledge: new Set(['developer-profile.md']),
  project: new Set(['project-context.md', 'project-profile.md']),
};

/** Shared directories to copy from .atta/ source to .atta/ in the target */
const SHARED_DIRS = [
  'knowledge',
  'project',
  'scripts',
  '.metadata',
  '.context',
  // Note: 'docs' intentionally excluded — Atta meta-docs don't ship to user projects.
  // Users can read them at https://github.com/nicholasgasior/atta-dev
];

/** Individual shared files to copy */
const SHARED_FILES = [
  '.sessions/schema.json',
  '.sessions/README.md',
  '.sessions/TRACKING_GUIDE.md',
  '.sessions/SKILL_TEMPLATE.md',
  '.sessions/INTEGRATION_EXAMPLE.md',
];

/**
 * Copy shared (tool-agnostic) content from .atta/ source to .atta/ in the target project.
 * Copies knowledge, scripts, metadata, context, and session schema. Does not copy docs.
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
    console.log(`  ${pc.green('✓')} .atta/.sessions/ (schema + templates)`);
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
 * @param {boolean} [config.resolveAttaPlaceholders=false] - Resolve {attaDir}/{agentsDir}/{bootstrapDir}/{knowledgeDir}/{metadataDir} to literal paths
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

  // 3. Replace slash-command references: `/review`, `/agent`, etc.
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
    result = result.replace(/\{knowledgeDir\}/g, '.atta/knowledge');
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
