import {
  existsSync,
  mkdirSync,
  cpSync,
  writeFileSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import pc from 'picocolors';

/** Directories to copy from canonical .claude/ source */
const FRAMEWORK_DIRS = [
  'agents',
  'bootstrap',
  'docs',
  'knowledge',
  'scripts',
  'skills',
  '.context',
  '.metadata',
];

/** Individual files to copy */
const FRAMEWORK_FILES = ['.sessions/schema.json', '.sessions/README.md'];

/**
 * Claude Code adapter — copies .claude/ directory and generates plugin manifest.
 */
export function install(frameworkRoot, targetDir, options = {}) {
  const claudeDir = join(targetDir, '.claude');
  const results = { files: 0, dirs: [] };

  // Copy framework directories
  for (const dir of FRAMEWORK_DIRS) {
    const src = join(frameworkRoot, dir);
    const dest = join(claudeDir, dir);
    if (!existsSync(src)) continue;

    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
    const count = countFiles(dest);
    results.files += count;
    results.dirs.push({ name: dir, count });

    if (!options.quiet) {
      console.log(`  ${pc.green('✓')} .claude/${dir}/ (${count} files)`);
    }
  }

  // Copy individual files
  for (const file of FRAMEWORK_FILES) {
    const src = join(frameworkRoot, file);
    const dest = join(claudeDir, file);
    if (!existsSync(src)) continue;

    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
    results.files++;

    if (!options.quiet) {
      console.log(`  ${pc.green('✓')} .claude/${file}`);
    }
  }

  // Generate plugin manifest
  const pluginDir = join(targetDir, '.claude-plugin');
  mkdirSync(pluginDir, { recursive: true });

  const version = readVersion(frameworkRoot);
  const manifest = {
    name: 'atta',
    version,
    description:
      'Atta — AI Dev Team Agent. Dynamic agent generation, multi-tool support, and intelligent code review.',
    skills: listSkills(frameworkRoot).map(({ name, description, path }) => ({ name, description, path })),
    agents_index: '.claude/agents/INDEX.md',
  };

  writeFileSync(
    join(pluginDir, 'plugin.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  );
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} .claude-plugin/plugin.json`);
  }

  return results;
}

function readVersion(frameworkRoot) {
  try {
    return readFileSync(
      join(frameworkRoot, '.metadata', 'version'),
      'utf-8'
    ).trim();
  } catch {
    return '0.0.0';
  }
}

/** Parse SKILL.md frontmatter and return skill metadata */
export function listSkills(frameworkRoot) {
  const skillsDir = join(frameworkRoot, 'skills');
  if (!existsSync(skillsDir)) return [];

  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = join(skillsDir, entry.name, 'SKILL.md');
    if (!existsSync(skillFile)) continue;

    const { name, description } = parseFrontmatter(skillFile);
    skills.push({
      name: name || entry.name,
      dirName: entry.name,
      description: description || '',
      path: `.claude/skills/${entry.name}/SKILL.md`,
    });
  }

  return skills;
}

/** Parse YAML-style frontmatter from a markdown file */
export function parseFrontmatter(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

function countFiles(dir) {
  let count = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (entry.isFile()) count++;
    }
  } catch {
    // Ignore
  }
  return count;
}
