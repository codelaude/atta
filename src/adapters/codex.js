import { existsSync, mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { listSkills } from './claude-code.js';
import { generateAgentsMd } from './agents-md.js';
import { copyAgentFiles, copyBootstrap } from './shared.js';

/**
 * Codex CLI adapter — generates .agents/skills/, .agents/agents/, and AGENTS.md.
 *
 * Codex CLI reads AGENTS.md as the primary instruction file.
 * Skills are placed at .agents/skills/{name}/SKILL.md.
 * Agent definitions are placed at .agents/agents/{name}.md.
 * Skill activation via /skills menu or $skill-name mention.
 */
export function install(frameworkRoot, targetDir, options = {}) {
  const results = { files: 0 };

  // Generate AGENTS.md with Codex-specific paths and $ prefix
  const agentsMd = generateAgentsMd(frameworkRoot, {
    skillPrefix: '$',
    agentBasePath: '.agents/agents',
  });
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

  // Copy agent definitions to .agents/agents/
  const agentCount = copyAgentFiles(
    frameworkRoot,
    join(targetDir, '.agents', 'agents'),
    options
  );
  results.files += agentCount;

  if (!options.quiet && agentCount > 0) {
    console.log(
      `  ${pc.green('✓')} .agents/agents/ (${agentCount} agent definitions)`
    );
  }

  // Copy bootstrap to .atta/bootstrap/ (shared assets for /atta skill)
  const bootstrapCount = copyBootstrap(frameworkRoot, targetDir, options);
  results.files += bootstrapCount;

  return results;
}
