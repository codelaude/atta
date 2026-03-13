import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { listSkills } from './claude-code.js';
import { generateAgentsMd } from './agents-md.js';
import { copyAgentFiles, copyBootstrap, copySharedContent, rewriteSkillBody, createMemoryDirectory, generateHooksConfig } from './shared.js';
import { generateReviewRules, formatCursorBugbot, formatCursorMdc } from './review-guidance.js';

/**
 * Cursor adapter — generates AGENTS.md, .cursor/rules/*.mdc, and .cursor/agents/.
 *
 * Cursor uses:
 * - AGENTS.md: project context loaded automatically (supported natively)
 * - .cursor/rules/*.mdc: project-scoped rules with YAML frontmatter
 *   - atta.mdc: always-applied framework overview (alwaysApply: true)
 *   - atta-{name}.mdc: individual skills (alwaysApply: false, @-mentionable)
 * - .cursor/agents/: agent definition files (referenced from AGENTS.md)
 *
 * Skills have no slash command invocation — users @-mention rule files in chat
 * (e.g., @atta-review, @atta-preflight) or Cursor applies them intelligently
 * based on the description field.
 *
 * Note: .cursorrules is the legacy format (deprecated). Use .cursor/rules/*.mdc.
 */
export function install(claudeRoot, attaRoot, targetDir, options = {}) {
  const results = { files: 0 };
  const skills = listSkills(claudeRoot);

  // Build commandMap dynamically: /atta-review → @atta-review (@ prefix for Cursor @-mentions)
  const cursorCommandMap = Object.fromEntries(
    skills.map((s) => [s.dirName, `@${s.dirName}`])
  );
  const cursorRewriteConfig = {
    agentsPath: '.cursor/agents',
    memoryPath: '.cursor/agents/memory',
    commandMap: cursorCommandMap,
  };

  // Generate AGENTS.md (Cursor supports AGENTS.md natively)
  const agentsMd = generateAgentsMd(claudeRoot, attaRoot, {
    skillPrefix: '@',
    agentBasePath: '.cursor/agents',
  });
  writeFileSync(join(targetDir, 'AGENTS.md'), agentsMd);
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} AGENTS.md`);
  }

  // Convert skills to .cursor/rules/{dirName}.mdc (e.g., atta-review.mdc)
  const skillsDir = join(claudeRoot, 'skills');
  if (existsSync(skillsDir)) {
    const rulesDir = join(targetDir, '.cursor', 'rules');
    mkdirSync(rulesDir, { recursive: true });

    for (const skill of skills) {
      const skillFile = join(skillsDir, skill.dirName, 'SKILL.md');
      if (!existsSync(skillFile)) continue;

      const mdc = skillToMdc(skill, skillFile, cursorRewriteConfig);
      writeFileSync(join(rulesDir, `${skill.dirName}.mdc`), mdc);
      results.files++;
    }

    // Generate main atta.mdc — always-applied framework context
    const mainMdc = buildMainMdc(skills);
    writeFileSync(join(rulesDir, 'atta.mdc'), mainMdc);
    results.files++;

    if (!options.quiet) {
      console.log(
        `  ${pc.green('✓')} .cursor/rules/ (${skills.length} skill rules + atta.mdc)`
      );
    }
  }

  // Generate review guidance files
  const reviewRules = generateReviewRules(attaRoot, options.detectedTechs);

  // .cursor/BUGBOT.md — BugBot PR review (conditional rules)
  const bugbotContent = formatCursorBugbot(reviewRules);
  mkdirSync(join(targetDir, '.cursor'), { recursive: true });
  writeFileSync(join(targetDir, '.cursor', 'BUGBOT.md'), bugbotContent);
  results.files++;

  // .cursor/rules/atta-review-guidance.mdc — generated review rules (distinct from atta-review skill)
  const reviewMdc = formatCursorMdc(reviewRules);
  const rulesDir2 = join(targetDir, '.cursor', 'rules');
  mkdirSync(rulesDir2, { recursive: true });
  writeFileSync(join(rulesDir2, 'atta-review-guidance.mdc'), reviewMdc);
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} .cursor/BUGBOT.md + .cursor/rules/atta-review-guidance.mdc (review guidance)`);
  }

  // Copy agent definitions to .cursor/agents/
  // Cursor also discovers .claude/agents/ natively, but we generate copies
  // with rewritten paths for standalone Cursor projects (no .claude/ present).
  const agentCount = copyAgentFiles(
    claudeRoot,
    join(targetDir, '.cursor', 'agents'),
    {
      ...options,
      transformFrontmatter: (fm) => ({
        name: fm.name,
        description: fm.description,
      }),
      transformBody: (body) => rewriteSkillBody(body, cursorRewriteConfig),
    }
  );
  results.files += agentCount;

  if (!options.quiet && agentCount > 0) {
    console.log(
      `  ${pc.green('✓')} .cursor/agents/ (${agentCount} agent definitions)`
    );
  }

  // Create memory directory with directives placeholder
  createMemoryDirectory(join(targetDir, '.cursor', 'agents'), options);
  results.files++;

  // Generate hooks.json (Cursor hook format — 19+ events, placeholder for user customization)
  const cursorDir = join(targetDir, '.cursor');
  const hooksJsonPath = join(cursorDir, 'hooks.json');
  if (!existsSync(hooksJsonPath)) {
    mkdirSync(cursorDir, { recursive: true });
    const hooksConfig = generateHooksConfig('cursor');
    writeFileSync(hooksJsonPath, JSON.stringify(hooksConfig, null, 2) + '\n');
    results.files++;

    if (!options.quiet) {
      console.log(`  ${pc.green('✓')} .cursor/hooks.json (10 event placeholders)`);
    }
  }

  // Copy shared content to .atta/ (team, project, scripts, metadata)
  const sharedCount = copySharedContent(attaRoot, targetDir, options);
  results.files += sharedCount;

  // Copy bootstrap to .atta/bootstrap/
  const bootstrapCount = copyBootstrap(attaRoot, targetDir, options);
  results.files += bootstrapCount;

  return results;
}

/**
 * Convert a SKILL.md file to a Cursor .mdc rule.
 * Extracts body content and wraps in MDC frontmatter.
 * Skills are not auto-applied — users @-mention them or Cursor applies
 * intelligently based on the description field.
 */
function skillToMdc(skill, skillFile, rewriteConfig) {
  const content = readFileSync(skillFile, 'utf-8');
  const rawBody = content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
  const body = rewriteSkillBody(rawBody, rewriteConfig);
  const desc = skill.description || `Run the ${skill.name} skill`;

  const lines = [];
  lines.push('---');
  const safeDesc = /[:#\[\]{}>|*&!%@`]/.test(desc)
    ? `"${desc.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    : desc;
  lines.push(`description: ${safeDesc}`);
  lines.push('globs: []');
  lines.push('alwaysApply: false');
  lines.push('---');
  lines.push('');
  lines.push(body);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate the main atta.mdc — always-applied framework context rule.
 * Provides Cursor with the agent team overview and skill reference without
 * requiring the user to explicitly @-mention it.
 */
function buildMainMdc(skills) {
  const skillList = skills
    .map((s) => `- \`@${s.dirName}\` — ${s.description || s.name}`)
    .join('\n');

  return `---
description: Atta AI development team framework — agent routing and core conventions
globs: []
alwaysApply: true
---

# Atta Agent Framework

This project uses the Atta framework for AI-assisted development. Atta provides a virtual development team with specialized agents that guide code quality, architecture, and security.

See \`AGENTS.md\` for the full agent registry and \`.cursor/agents/\` for agent definitions.

## Available Skills

@-mention any skill in chat to activate it, or Cursor will apply it when relevant:

${skillList}

## Agent Team

Agents use a three-tier hierarchy:
1. **Core Agents** — Always available (project-owner, code-reviewer, librarian, rubber-duck)
2. **Coordinators** — Generated per project (fe-team-lead, be-team-lead)
3. **Specialists** — Generated from detected tech stack (run \`@atta\` to set up)

Invoke agents by mentioning their role in chat (e.g., "ask the code-reviewer to review this").
`;
}
