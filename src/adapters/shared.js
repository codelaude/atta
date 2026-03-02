import { existsSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
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

/** Shared directories to copy from .atta/ source to .atta/ in the target */
const SHARED_DIRS = [
  'knowledge',
  'scripts',
  'docs',
  '.metadata',
  '.context',
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
 * Copies knowledge, scripts, docs, metadata, context, and session schema.
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
    cpSync(src, dest, { recursive: true });
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
 * Recursively count files in a directory.
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
