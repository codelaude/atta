import { existsSync, mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { listSkills } from './claude-code.js';
import { generateAgentsMd } from './agents-md.js';

/**
 * Codex CLI adapter — generates .agents/skills/ and AGENTS.md.
 *
 * Codex CLI reads AGENTS.md as the primary instruction file.
 * Skills are placed at .agents/skills/{name}/SKILL.md.
 * Skill activation via /skills menu or $skill-name mention.
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

  // Copy skills to .agents/skills/
  const skillsDir = join(frameworkRoot, 'skills');
  if (existsSync(skillsDir)) {
    const skills = listSkills(frameworkRoot);
    const agentsSkillsDir = join(targetDir, '.agents', 'skills');

    for (const skill of skills) {
      const src = join(skillsDir, skill.dirName, 'SKILL.md');
      const dest = join(agentsSkillsDir, skill.dirName, 'SKILL.md');

      if (!existsSync(src)) continue;

      mkdirSync(join(agentsSkillsDir, skill.dirName), { recursive: true });
      cpSync(src, dest);
      results.files++;
    }

    if (!options.quiet) {
      console.log(
        `  ${pc.green('✓')} .agents/skills/ (${skills.length} skills)`
      );
    }
  }

  return results;
}
