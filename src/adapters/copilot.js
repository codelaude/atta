import { existsSync, mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { listSkills } from './claude-code.js';
import { generateAgentsMd } from './agents-md.js';

/**
 * Copilot CLI adapter — generates .github/skills/ and AGENTS.md.
 *
 * Copilot CLI reads SKILL.md files with the same frontmatter format as Claude Code.
 * Skills are copied to .github/skills/{name}/SKILL.md.
 * AGENTS.md is generated at the project root.
 */
export function install(frameworkRoot, targetDir, options = {}) {
  const results = { files: 0 };

  // Generate AGENTS.md
  const agentsMd = generateAgentsMd(frameworkRoot);
  writeFileSync(join(targetDir, 'AGENTS.md'), agentsMd);
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} AGENTS.md`);
  }

  // Copy skills to .github/skills/
  const skillsDir = join(frameworkRoot, 'skills');
  if (existsSync(skillsDir)) {
    const skills = listSkills(frameworkRoot);
    const githubSkillsDir = join(targetDir, '.github', 'skills');

    for (const skill of skills) {
      const src = join(skillsDir, skill.dirName, 'SKILL.md');
      const dest = join(githubSkillsDir, skill.dirName, 'SKILL.md');

      if (!existsSync(src)) continue;

      mkdirSync(join(githubSkillsDir, skill.dirName), { recursive: true });
      cpSync(src, dest);
      results.files++;
    }

    if (!options.quiet) {
      console.log(
        `  ${pc.green('✓')} .github/skills/ (${skills.length} skills)`
      );
    }
  }

  // Copy .github/copilot-instructions.md (instruction file)
  const instructionContent = [
    '# Copilot Instructions',
    '',
    'This project uses the Atta framework for AI-assisted development.',
    'See AGENTS.md for the full agent registry and available commands.',
    '',
    '## Available Skills',
    '',
    'Skills are available in `.github/skills/` as SKILL.md files.',
    'Use `/skill-name` to activate a skill (e.g., `/review`, `/preflight`).',
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
