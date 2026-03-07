import { existsSync, mkdirSync, cpSync, lstatSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import pc from 'picocolors';

/**
 * Shared utilities for all adapters.
 */

/**
 * Copy agent definition .md files from framework source to target directory.
 * Copies core agents, coordinators, and specialists.
 *
 * @param {string} claudeRoot - Path to .claude/ source (agents live here)
 * @param {string} destAgentsDir - Target directory for agent files
 * @param {object} [options] - Options (quiet: boolean)
 * @returns {number} Number of files copied
 */
export function copyAgentFiles(claudeRoot, destAgentsDir, options = {}) {
  const srcAgentsDir = join(claudeRoot, 'agents');
  if (!existsSync(srcAgentsDir)) return 0;

  let count = 0;

  // Core agents (root .md files, skip INDEX, README, and subdirectories)
  const rootFiles = readdirSync(srcAgentsDir, { withFileTypes: true })
    .filter(
      (f) =>
        f.isFile() &&
        f.name.endsWith('.md') &&
        f.name !== 'INDEX.md' &&
        f.name !== 'README.md'
    );

  if (rootFiles.length > 0) {
    mkdirSync(destAgentsDir, { recursive: true });
    for (const file of rootFiles) {
      cpSync(join(srcAgentsDir, file.name), join(destAgentsDir, file.name));
      count++;
    }
  }

  // Coordinators
  const coordDir = join(srcAgentsDir, 'coordinators');
  if (existsSync(coordDir)) {
    const coordFiles = readdirSync(coordDir).filter(
      (f) => f.endsWith('.md') && f !== 'README.md'
    );
    if (coordFiles.length > 0) {
      mkdirSync(join(destAgentsDir, 'coordinators'), { recursive: true });
      for (const file of coordFiles) {
        cpSync(
          join(coordDir, file),
          join(destAgentsDir, 'coordinators', file)
        );
        count++;
      }
    }
  }

  // Specialists
  const specDir = join(srcAgentsDir, 'specialists');
  if (existsSync(specDir)) {
    const specFiles = readdirSync(specDir).filter(
      (f) => f.endsWith('.md') && f !== 'README.md'
    );
    if (specFiles.length > 0) {
      mkdirSync(join(destAgentsDir, 'specialists'), { recursive: true });
      for (const file of specFiles) {
        cpSync(
          join(specDir, file),
          join(destAgentsDir, 'specialists', file)
        );
        count++;
      }
    }
  }

  return count;
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
 * @param {boolean} [config.resolveAttaPlaceholders=false] - Resolve {attaDir}/{agentsDir}/{bootstrapDir}/{metadataDir} to literal paths
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
