import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { listSkills } from './claude-code.js';
import { generateAgentsMd } from './agents-md.js';
import { copyAgentFiles, copyBootstrap, copySharedContent, rewriteSkillBody, checkSkillConflicts, createMemoryDirectory, generateHooks, writeHookScripts } from './shared.js';
import { generateReviewRules, formatCursorBugbot, formatCursorMdc } from './review-guidance.js';
import { generateRules, writeToolAgnosticRules, installCursorRules } from './rules-generator.js';

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
  const skills = listSkills(claudeRoot).filter((s) => s.userInvocable !== false);
  checkSkillConflicts(skills, 'cursor', options);

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
    selectedAgents: options.selectedAgents,
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
      // Skip core 'atta' skill — its content is subsumed by the always-applied atta.mdc below
      if (skill.dirName === 'atta') continue;
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
        `  ${pc.green('✓')} .cursor/rules/ (${skills.length - 1} skill rules + atta.mdc)`
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

  // Generate path-scoped rules (.cursor/rules/atta-{tech}.mdc + .atta/team/rules/)
  const rules = generateRules(attaRoot, options.detectedTechs);
  if (rules.length > 0) {
    const agnosticCount = writeToolAgnosticRules(targetDir, rules);
    const nativeCount = installCursorRules(targetDir, rules);
    results.files += agnosticCount + nativeCount;

    if (!options.quiet) {
      console.log(`  ${pc.green('✓')} .atta/team/rules/ (${agnosticCount} rule files)`);
      console.log(`  ${pc.green('✓')} .cursor/rules/ (${nativeCount} path-scoped rules)`);
    }
  }

  // Copy agent definitions to .cursor/agents/
  // Cursor also discovers .claude/agents/ natively, but we generate copies
  // with rewritten paths for standalone Cursor projects (no .claude/ present).
  const agentCount = copyAgentFiles(
    claudeRoot,
    join(targetDir, '.cursor', 'agents'),
    {
      ...options,
      transformFrontmatter: (fm) => {
        const result = { name: fm.name, description: fm.description };
        // Cursor supports readonly: derive from disallowedTools containing Edit/Write
        if (fm.disallowedTools) {
          const disallowed = Array.isArray(fm.disallowedTools) ? fm.disallowedTools : fm.disallowedTools.split(/,\s*/);
          if (disallowed.some(t => t.trim() === 'Edit' || t.trim() === 'Write')) {
            result.readonly = true;
          }
        }
        return result;
      },
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

  // Always regenerate hooks.json — enforcement hooks may change with detectedTechs
  const cursorDir = join(targetDir, '.cursor');
  mkdirSync(cursorDir, { recursive: true });
  const hooksConfig = generateHooks('cursor', options.detectedTechs);
  writeFileSync(join(cursorDir, 'hooks.json'), JSON.stringify(hooksConfig, null, 2) + '\n');
  results.files++;

  // Write hook scripts to .atta/scripts/hooks/ (model-gate, pre-bash-safety, stop-quality-gate)
  const scriptCount = writeHookScripts(targetDir);
  results.files += scriptCount;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} .cursor/hooks.json (enforcement hooks)`);
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
  let body = rewriteSkillBody(rawBody, rewriteConfig);

  // Embed disable-model-invocation as natural language (Cursor MDC strips all SKILL.md flags)
  if (skill.disableModelInvocation) {
    body = '> **IMPORTANT**: Execute this skill\'s instructions directly. Do not use AI inference — run the prescribed steps as-is.\n\n' + body;
  }

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
1. **Core Agents** — Always available (project-owner, code-reviewer, librarian, architect)
2. **Coordinators** — Generated per project (fe-team-lead, be-team-lead)
3. **Specialists** — Generated from detected tech stack (run \`@atta\` to set up)

Invoke agents by mentioning their role in chat (e.g., "ask the code-reviewer to review this").
`;
}
