import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { listSkills } from './claude-code.js';
import { generateAgentsMd } from './agents-md.js';
import { copyAgentFiles, copyBootstrap, copySharedContent, rewriteSkillBody, createMemoryDirectory } from './shared.js';

/**
 * Codex CLI adapter — generates .agents/skills/, .agents/agents/, and AGENTS.md.
 *
 * Codex CLI reads AGENTS.md as the primary instruction file.
 * Skills are placed at .agents/skills/{name}/SKILL.md.
 * Agent definitions are placed at .agents/agents/{name}.md.
 * Skill activation via /skills menu or $skill-name mention.
 */
export function install(claudeRoot, attaRoot, targetDir, options = {}) {
  const results = { files: 0 };

  // Generate AGENTS.md with Codex-specific paths and $ prefix
  const agentsMd = generateAgentsMd(claudeRoot, attaRoot, {
    skillPrefix: '$',
    agentBasePath: '.agents/agents',
  });
  writeFileSync(join(targetDir, 'AGENTS.md'), agentsMd);
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} AGENTS.md`);
  }

  // Copy skills to .agents/skills/
  const skillsDir = join(claudeRoot, 'skills');
  if (existsSync(skillsDir)) {
    const skills = listSkills(claudeRoot);
    const agentsSkillsDir = join(targetDir, '.agents', 'skills');

    // Codex uses $skill invocation — rewrite /command → $command
    const codexCommandMap = {
      review: '$review',
      agent: '$agent',
      atta: '$atta',
      preflight: '$preflight',
      lint: '$lint',
      test: '$test',
      collaborate: '$collaborate',
      'team-lead': '$team-lead',
      librarian: '$librarian',
      patterns: '$patterns',
      profile: '$profile',
      'security-audit': '$security-audit',
      ship: '$ship',
      tutorial: '$tutorial',
      optimize: '$optimize',
      update: '$update',
      migrate: '$migrate',
    };

    const rewriteConfig = {
      agentsPath: '.agents/agents',
      memoryPath: '.agents/agents/memory',
      commandMap: codexCommandMap,
    };

    for (const skill of skills) {
      const src = join(skillsDir, skill.dirName, 'SKILL.md');
      const dest = join(agentsSkillsDir, skill.dirName, 'SKILL.md');

      if (!existsSync(src)) continue;

      mkdirSync(join(agentsSkillsDir, skill.dirName), { recursive: true });

      // Rewrite body content for Codex compatibility
      const content = readFileSync(src, 'utf-8');
      const fmMatch = content.match(/^---\n[\s\S]*?\n---\n/);
      if (fmMatch) {
        const frontmatter = fmMatch[0];
        const body = content.slice(frontmatter.length);
        writeFileSync(dest, frontmatter + rewriteSkillBody(body, rewriteConfig));
      } else {
        writeFileSync(dest, rewriteSkillBody(content, rewriteConfig));
      }

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
    claudeRoot,
    join(targetDir, '.agents', 'agents'),
    options
  );
  results.files += agentCount;

  if (!options.quiet && agentCount > 0) {
    console.log(
      `  ${pc.green('✓')} .agents/agents/ (${agentCount} agent definitions)`
    );
  }

  // Create memory directory with directives placeholder
  createMemoryDirectory(join(targetDir, '.agents', 'agents'), options);
  results.files++;

  // Copy shared content to .atta/ (knowledge, project, scripts, metadata, context)
  const sharedCount = copySharedContent(attaRoot, targetDir, options);
  results.files += sharedCount;

  // Copy bootstrap to .atta/bootstrap/
  const bootstrapCount = copyBootstrap(attaRoot, targetDir, options);
  results.files += bootstrapCount;

  return results;
}
