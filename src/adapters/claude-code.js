import {
  existsSync,
  mkdirSync,
  cpSync,
  writeFileSync,
  renameSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import pc from 'picocolors';
import { generateAgentsMd } from './agents-md.js';
import { readVersion, countFiles } from '../lib/fs-utils.js';
import { copySharedContent, copyBootstrap } from './shared.js';
import { generateReviewRules, formatClaudeCode } from './review-guidance.js';

/** Directories to copy from .claude/ source (discovery-required, tool-specific) */
const CLAUDE_DIRS = ['agents', 'hooks', 'skills'];

/**
 * Claude Code adapter — copies .claude/ (tool-specific) and .atta/ (shared) content,
 * generates settings and plugin manifest.
 *
 * @param {string} claudeRoot - Path to .claude/ source (agents, skills, hooks)
 * @param {string} attaRoot - Path to .atta/ source (team, project, scripts, metadata)
 * @param {string} targetDir - Project root
 * @param {object} [options]
 */
export function install(claudeRoot, attaRoot, targetDir, options = {}) {
  const claudeDir = join(targetDir, '.claude');
  const results = { files: 0, dirs: [] };

  // Copy tool-specific directories to .claude/
  for (const dir of CLAUDE_DIRS) {
    const src = join(claudeRoot, dir);
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

  // Generate hooks.json for plugin manifest (hooks field must be a file path per spec)
  const hooksDir = join(claudeDir, 'hooks');
  const hooksJsonPath = join(hooksDir, 'hooks.json');
  if (!existsSync(hooksJsonPath)) {
    mkdirSync(hooksDir, { recursive: true });
    const hookCmd = '"$CLAUDE_PROJECT_DIR"/.claude/hooks/session-track.sh';
    const hooksConfig = {
      PostToolUse: [
        {
          matcher: 'Skill',
          hooks: [{ type: 'command', command: hookCmd, async: true }],
        },
      ],
      Stop: [
        {
          hooks: [{ type: 'command', command: hookCmd, async: true }],
        },
      ],
    };
    const tmpHooks = hooksJsonPath + '.tmp';
    writeFileSync(tmpHooks, JSON.stringify(hooksConfig, null, 2) + '\n');
    renameSync(tmpHooks, hooksJsonPath);
    results.files++;

    if (!options.quiet) {
      console.log(`  ${pc.green('✓')} .claude/hooks/hooks.json (session tracking hooks)`);
    }
  }

  // Copy shared content to .atta/
  const sharedCount = copySharedContent(attaRoot, targetDir, options);
  results.files += sharedCount;

  // Copy bootstrap to .atta/bootstrap/
  const bootstrapCount = copyBootstrap(attaRoot, targetDir, options);
  results.files += bootstrapCount;

  // Generate default settings (only if none exist)
  const settingsPath = join(claudeDir, 'settings.local.json');
  if (!existsSync(settingsPath)) {
    const defaultSettings = {
      permissions: {
        allow: [
          // Framework scripts (session cleanup, context generation, pattern detection)
          'Bash(bash .atta/scripts/session-cleanup.sh:*)',
          'Bash(bash .atta/scripts/generate-context.sh:*)',
          'Bash(bash .atta/scripts/pattern-log.sh:*)',
          'Bash(bash .atta/scripts/pattern-analyze.sh:*)',
          // Local files (context, sessions, developer profile)
          'Edit(./.atta/local/**)',
          // Agent memory (directives, learnings)
          'Edit(./.claude/agents/memory/**)',
          // Team knowledge (patterns, ci-suppressions, review guidance)
          'Edit(./.atta/team/**)',
          // Project files (team-shared: project-context, project-profile)
          'Edit(./.atta/project/**)',
        ],
      },
      hooks: {
        PostToolUse: [
          {
            matcher: 'Skill',
            hooks: [
              {
                type: 'command',
                command:
                  '"$CLAUDE_PROJECT_DIR"/.claude/hooks/session-track.sh',
                async: true,
              },
            ],
          },
        ],
        Stop: [
          {
            hooks: [
              {
                type: 'command',
                command:
                  '"$CLAUDE_PROJECT_DIR"/.claude/hooks/session-track.sh',
                async: true,
              },
            ],
          },
        ],
      },
    };
    const tmpSettings = settingsPath + '.tmp';
    writeFileSync(tmpSettings, JSON.stringify(defaultSettings, null, 2) + '\n');
    renameSync(tmpSettings, settingsPath);
    results.files++;

    if (!options.quiet) {
      console.log(`  ${pc.green('✓')} .claude/settings.local.json (default permissions)`);
    }
  } else {
    // Existing settings — ensure hook config is present (safe merge, additive only)
    try {
      const existing = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      const hookCmd =
        '"$CLAUDE_PROJECT_DIR"/.claude/hooks/session-track.sh';
      let modified = false;

      if (!existing.hooks) {
        existing.hooks = {};
      }

      // Check if a hook command already exists anywhere in a hook array
      const hasHookCmd = (entries) =>
        Array.isArray(entries) &&
        entries.some(
          (entry) =>
            entry &&
            typeof entry === 'object' &&
            Array.isArray(entry.hooks) &&
            entry.hooks.some((h) => h.command === hookCmd)
        );

      // Add PostToolUse hook if session-track not present
      if (!hasHookCmd(existing.hooks.PostToolUse)) {
        if (!Array.isArray(existing.hooks.PostToolUse)) {
          existing.hooks.PostToolUse = [];
        }
        existing.hooks.PostToolUse.push({
          matcher: 'Skill',
          hooks: [{ type: 'command', command: hookCmd, async: true }],
        });
        modified = true;
      }

      // Add Stop hook if session-track not present
      if (!hasHookCmd(existing.hooks.Stop)) {
        if (!Array.isArray(existing.hooks.Stop)) {
          existing.hooks.Stop = [];
        }
        existing.hooks.Stop.push({
          hooks: [{ type: 'command', command: hookCmd, async: true }],
        });
        modified = true;
      }

      if (modified) {
        const tmpSettings = settingsPath + '.tmp';
        writeFileSync(
          tmpSettings,
          JSON.stringify(existing, null, 2) + '\n'
        );
        renameSync(tmpSettings, settingsPath);

        if (!options.quiet) {
          console.log(
            `  ${pc.green('✓')} .claude/settings.local.json (added session tracking hooks)`
          );
        }
      }
    } catch {
      // Ignore — don't break install if settings can't be parsed
    }
  }

  // Generate CLAUDE.md (only if none exist)
  const claudeMdPath = join(targetDir, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) {
    const claudeMd = generateClaudeMd(claudeRoot, attaRoot);
    const tmpClaudeMd = claudeMdPath + '.tmp';
    writeFileSync(tmpClaudeMd, claudeMd);
    renameSync(tmpClaudeMd, claudeMdPath);
    results.files++;

    if (!options.quiet) {
      console.log(`  ${pc.green('✓')} CLAUDE.md`);
    }
  }

  // Generate REVIEW.md (review guidance for Claude Code code review)
  const reviewMdPath = join(targetDir, 'REVIEW.md');
  if (!existsSync(reviewMdPath)) {
    const reviewRules = generateReviewRules(attaRoot, options.detectedTechs);
    const reviewMd = formatClaudeCode(reviewRules);
    const tmpReview = reviewMdPath + '.tmp';
    writeFileSync(tmpReview, reviewMd);
    renameSync(tmpReview, reviewMdPath);
    results.files++;

    if (!options.quiet) {
      console.log(`  ${pc.green('✓')} REVIEW.md (code review guidance)`);
    }
  }

  // Generate plugin manifest (matches Claude Code plugin spec)
  const pluginDir = join(targetDir, '.claude-plugin');
  mkdirSync(pluginDir, { recursive: true });

  const version = readVersion(attaRoot);
  const manifest = {
    name: 'atta',
    version,
    description:
      'Atta — AI Dev Team Agent. Dynamic agent generation, multi-tool support, and intelligent code review.',
    author: {
      name: 'CodeLaude',
      url: 'https://github.com/codelaude',
    },
    repository: 'https://github.com/codelaude/atta',
    license: 'MIT',
    keywords: ['framework', 'agents', 'skills', 'code-review'],
    skills: '.claude/skills/',
    agents: '.claude/agents/',
    hooks: '.claude/hooks/hooks.json',
  };

  const pluginPath = join(pluginDir, 'plugin.json');
  const tmpPlugin = pluginPath + '.tmp';
  writeFileSync(tmpPlugin, JSON.stringify(manifest, null, 2) + '\n');
  renameSync(tmpPlugin, pluginPath);
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} .claude-plugin/plugin.json`);
  }

  return results;
}

/**
 * Generate CLAUDE.md — instruction file for Claude Code.
 * Based on AGENTS.md content with Claude Code-specific framing.
 */
export function generateClaudeMd(claudeRoot, attaRoot) {
  const agentsMd = generateAgentsMd(claudeRoot, attaRoot, { includeHiddenSkills: true });

  const sessionStart = [
    '',
    '## On Every Session Start',
    '',
    '1. Read `.claude/agents/memory/directives.md` for persistent project rules (if it exists)',
    '   - This file contains **universal rules only** — agent-specific directives are loaded automatically when you invoke `/atta-agent`',
    '   - Do NOT read `directives-*.md` files at session start — they are scoped and loaded on demand',
    '',
  ].join('\n');

  return agentsMd
    .replace('# AGENTS.md', '# CLAUDE.md — Atta Agent Context')
    .replace(
      '> Generated by [Atta](https://github.com/codelaude/atta) — AI Dev Team Agent',
      '> Auto-loaded by Claude Code. Generated by [Atta](https://github.com/codelaude/atta).\n>\n> This file provides your agent team context and available skills. Edit freely — it won\'t be overwritten on update.\n' +
        sessionStart
    );
}

/** Parse SKILL.md frontmatter and return skill metadata */
export function listSkills(claudeRoot) {
  const skillsDir = join(claudeRoot, 'skills');
  if (!existsSync(skillsDir)) return [];

  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = join(skillsDir, entry.name, 'SKILL.md');
    if (!existsSync(skillFile)) continue;

    const fm = parseFrontmatter(skillFile);
    skills.push({
      name: fm.name || entry.name,
      dirName: entry.name,
      description: fm.description || '',
      path: `.claude/skills/${entry.name}/SKILL.md`,
      userInvocable: fm['user-invocable'] !== 'false',
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
