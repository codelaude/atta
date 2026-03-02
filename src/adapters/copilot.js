import { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { listSkills } from './claude-code.js';
import { generateAgentsMd } from './agents-md.js';
import { copyAgentFiles, copyBootstrap, copySharedContent } from './shared.js';

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

/** Skills that conflict with Copilot CLI built-in slash commands */
const COPILOT_BUILTIN_CONFLICTS = new Set(['review', 'agent']);

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

    for (const skill of skills) {
      const src = join(skillsDir, skill.dirName, 'SKILL.md');
      if (!existsSync(src)) continue;

      // Rename conflicting skills
      const destName = SKILL_RENAMES[skill.dirName] || skill.dirName;
      const destDir = join(githubSkillsDir, destName);
      const dest = join(destDir, 'SKILL.md');

      mkdirSync(destDir, { recursive: true });

      if (COPILOT_BUILTIN_CONFLICTS.has(skill.dirName)) {
        // Rewrite frontmatter with renamed skill name
        const content = readFileSync(src, 'utf-8');
        const renamed = content.replace(
          /^(---\nname:\s*)(.+)/m,
          `$1${destName}`
        );
        writeFileSync(dest, renamed);
      } else {
        cpSync(src, dest);
      }

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
    '## Available Skills',
    '',
    'Skills are available in `.github/skills/` as SKILL.md files.',
    'Use `/skill-name` to activate a skill (e.g., `/atta-review`, `/preflight`).',
    '',
    `**Renamed skills**: ${renamedList} (to avoid conflicts with Copilot built-in commands).`,
    '',
    '## Agent Definitions',
    '',
    'Agent definitions are in `.github/atta/agents/` as markdown files.',
    'Use `/atta-agent <id>` to invoke an agent (e.g., `/atta-agent project-owner`).',
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

