import { existsSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';

/**
 * Shared utilities for non-Claude-Code adapters (Copilot, Codex, Gemini).
 */

/**
 * Copy agent definition .md files from framework source to target directory.
 * Copies core agents, coordinators, and specialists.
 *
 * @param {string} frameworkRoot - Path to canonical .claude/ source
 * @param {string} destAgentsDir - Target directory for agent files
 * @param {object} [options] - Options (quiet: boolean)
 * @returns {number} Number of files copied
 */
export function copyAgentFiles(frameworkRoot, destAgentsDir, options = {}) {
  const srcAgentsDir = join(frameworkRoot, 'agents');
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
 * @param {string} frameworkRoot - Path to canonical .claude/ source
 * @param {string} targetDir - Project root where .atta/bootstrap/ will be created
 * @param {object} [options] - Options (quiet: boolean)
 * @returns {number} Number of files copied
 */
export function copyBootstrap(frameworkRoot, targetDir, options = {}) {
  const srcBootstrap = join(frameworkRoot, 'bootstrap');
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
