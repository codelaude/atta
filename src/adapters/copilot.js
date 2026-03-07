import { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { listSkills } from './claude-code.js';
import { generateAgentsMd } from './agents-md.js';
import { copyAgentFiles, copyBootstrap, copySharedContent, rewriteSkillBody, createMemoryDirectory } from './shared.js';

/**
 * Copilot CLI adapter — generates .github/skills/, .github/atta/agents/, and AGENTS.md.
 *
 * Copilot CLI reads SKILL.md files with the same frontmatter format as Claude Code.
 * Skills are copied to .github/skills/{name}/SKILL.md.
 * Agent definitions are copied to .github/atta/agents/ (NOT .github/agents/ which is
 * reserved for Copilot's native agent system and requires specific YAML frontmatter).
 * AGENTS.md is generated at the project root.
 *
 * Skills that conflict with Copilot built-in commands are renamed with an 'atta-' prefix.
 */

/**
 * Skills that conflict with Copilot CLI built-in slash commands.
 * Known built-ins (from /help output):
 *   /review — "Run code review agent to analyze changes"
 *   /agent  — "Browse and select from available agents"
 *   /update — "Update the CLI to the latest version"
 */
const COPILOT_BUILTIN_CONFLICTS = new Set(['review', 'agent', 'update']);

/** Map of original skill name → renamed skill name for Copilot */
const SKILL_RENAMES = Object.fromEntries(
  [...COPILOT_BUILTIN_CONFLICTS].map((name) => [name, `atta-${name}`])
);

export function install(claudeRoot, attaRoot, targetDir, options = {}) {
  const results = { files: 0 };

  // Generate AGENTS.md with Copilot-specific paths and renamed skills
  const agentsMd = generateAgentsMd(claudeRoot, attaRoot, {
    skillPrefix: '/',
    agentBasePath: '.github/atta/agents',
    skillRenames: SKILL_RENAMES,
  });
  writeFileSync(join(targetDir, 'AGENTS.md'), agentsMd);
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} AGENTS.md`);
  }

  // Copy skills to .github/skills/ (renaming conflicting ones)
  const skillsDir = join(claudeRoot, 'skills');
  if (existsSync(skillsDir)) {
    const skills = listSkills(claudeRoot);
    const githubSkillsDir = join(targetDir, '.github', 'skills');

    // Build command map for body rewriting (all renamed skills + standard rewrites)
    const copilotCommandMap = {};
    for (const [orig, renamed] of Object.entries(SKILL_RENAMES)) {
      copilotCommandMap[orig] = `/${renamed}`;
    }

    const rewriteConfig = {
      agentsPath: '.github/atta/agents',
      memoryPath: '.github/atta/agents/memory',
      commandMap: copilotCommandMap,
      commandPrefix: '/',
    };

    for (const skill of skills) {
      const src = join(skillsDir, skill.dirName, 'SKILL.md');
      if (!existsSync(src)) continue;

      const destName = SKILL_RENAMES[skill.dirName] || skill.dirName;
      const destDir = join(githubSkillsDir, destName);
      const dest = join(destDir, 'SKILL.md');

      mkdirSync(destDir, { recursive: true });

      let content = readFileSync(src, 'utf-8');

      // Rename frontmatter for conflicting skills
      if (COPILOT_BUILTIN_CONFLICTS.has(skill.dirName)) {
        content = content.replace(
          /^(---\nname:\s*)(.+)/m,
          `$1${destName}`
        );
      }

      // Rewrite body content (after frontmatter) for Copilot compatibility
      const fmMatch = content.match(/^---\n[\s\S]*?\n---\n/);
      if (fmMatch) {
        const frontmatter = fmMatch[0];
        const body = content.slice(frontmatter.length);
        content = frontmatter + rewriteSkillBody(body, rewriteConfig);
      }

      writeFileSync(dest, content);
      results.files++;
    }

    const renamedCount = skills.filter((s) => COPILOT_BUILTIN_CONFLICTS.has(s.dirName)).length;
    if (!options.quiet) {
      let msg = `  ${pc.green('✓')} .github/skills/ (${skills.length} skills`;
      if (renamedCount > 0) {
        msg += `, ${renamedCount} renamed to avoid Copilot built-in conflicts`;
      }
      msg += ')';
      console.log(msg);
    }
  }

  // Copy agent definitions to .github/atta/agents/ (avoids .github/agents/ namespace conflict)
  const agentCount = copyAgentFiles(
    claudeRoot,
    join(targetDir, '.github', 'atta', 'agents'),
    options
  );
  results.files += agentCount;

  if (!options.quiet && agentCount > 0) {
    console.log(
      `  ${pc.green('✓')} .github/atta/agents/ (${agentCount} agent definitions)`
    );
  }

  // Create memory directory with directives placeholder
  createMemoryDirectory(join(targetDir, '.github', 'atta', 'agents'), options);
  results.files++;

  // Generate .github/instructions/ files (Copilot-idiomatic instruction channel)
  const instructionsDir = join(targetDir, '.github', 'instructions');
  mkdirSync(instructionsDir, { recursive: true });

  // Skills instruction file — command table with renames and conflict warnings
  const renamedWarnings = Object.entries(SKILL_RENAMES)
    .map(([orig, renamed]) => `- **NEVER use \`/${orig}\`** — it triggers Copilot's built-in. Use \`/${renamed}\` instead.`)
    .join('\n');

  writeFileSync(join(instructionsDir, 'atta-skills.instructions.md'), [
    '# Atta Skills',
    '',
    'This project uses the Atta framework. Skills are in `.github/skills/`.',
    '',
    '## Command Conflicts',
    '',
    renamedWarnings,
    '',
    '## Invocation',
    '',
    'Use `/skill-name` to activate a skill (e.g., `/preflight`, `/lint`, `/atta-review`).',
    '',
  ].join('\n'));
  results.files++;

  // Agents instruction file — agent registry
  writeFileSync(join(instructionsDir, 'atta-agents.instructions.md'), [
    '# Atta Agents',
    '',
    'Agent definitions are in `.github/atta/agents/` as markdown files.',
    'Invoke agents via `/atta-agent <id>` (e.g., `/atta-agent project-owner`).',
    '',
    '## Agent Directory',
    '',
    '- **project-owner** — Routes tasks to specialists, coordinates work',
    '- **code-reviewer** — Code quality reviews, pattern enforcement',
    '- **librarian** — Captures rules, directives, and learnings',
    '- **rubber-duck** — Guided problem-solving and learning',
    '',
  ].join('\n'));
  results.files++;

  // Memory instruction file — directive storage paths
  writeFileSync(join(instructionsDir, 'atta-memory.instructions.md'), [
    '# Atta Memory',
    '',
    'Persistent memory (directives, learnings) is stored at:',
    '`.github/atta/agents/memory/directives.md`',
    '',
    'The Librarian agent reads and writes this file.',
    'Pattern detection artifacts are in `.atta/.context/`.',
    'Project knowledge is in `.atta/knowledge/` and `.atta/project/`.',
    '',
  ].join('\n'));
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} .github/instructions/ (3 instruction files)`);
  }

  // Copy shared content to .atta/ (knowledge, scripts, docs, metadata, context)
  const sharedCount = copySharedContent(attaRoot, targetDir, options);
  results.files += sharedCount;

  // Copy bootstrap to .atta/bootstrap/
  const bootstrapCount = copyBootstrap(attaRoot, targetDir, options);
  results.files += bootstrapCount;

  // Copy .github/copilot-instructions.md (instruction file)
  const renamedList = Object.entries(SKILL_RENAMES)
    .map(([orig, renamed]) => `\`/${orig}\` → \`/${renamed}\``)
    .join(', ');

  const instructionContent = [
    '# Copilot Instructions',
    '',
    'This project uses the Atta framework for AI-assisted development.',
    'See AGENTS.md for the full agent registry and available commands.',
    '',
    '## Critical: Command Conflicts',
    '',
    `The following Atta skills are renamed to avoid conflicts with Copilot built-in commands: ${renamedList}.`,
    '',
    ...Object.entries(SKILL_RENAMES).map(([orig, renamed]) =>
      `**NEVER use \`/${orig}\`** — it triggers Copilot\'s built-in command, not Atta. Use \`/${renamed}\` instead.`
    ),
    '',
    '## Available Skills',
    '',
    'Skills are in `.github/skills/` as SKILL.md files.',
    'Use `/skill-name` to activate (e.g., `/atta-review`, `/preflight`, `/lint`).',
    '',
    '## Agent Definitions',
    '',
    'Agent definitions: `.github/atta/agents/*.md`',
    'Agent memory: `.github/atta/agents/memory/directives.md`',
    'Invoke agents via `/atta-agent <id>` (e.g., `/atta-agent project-owner`).',
    '',
  ].join('\n');

  const githubDir = join(targetDir, '.github');
  mkdirSync(githubDir, { recursive: true });
  writeFileSync(join(githubDir, 'copilot-instructions.md'), instructionContent);
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} .github/copilot-instructions.md`);
  }

  return results;
}

