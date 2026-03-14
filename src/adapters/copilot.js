import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { listSkills } from './claude-code.js';
import { generateAgentsMd } from './agents-md.js';
import { copyAgentFiles, copyBootstrap, copySharedContent, rewriteSkillBody, filterSkillFrontmatter, COPILOT_SKILL_FIELDS, checkSkillConflicts, createMemoryDirectory, generateHooks, writeHookScripts } from './shared.js';
import { generateReviewRules, formatCopilot } from './review-guidance.js';
import { generateRules, writeToolAgnosticRules, installCopilotRules } from './rules-generator.js';

/**
 * Copilot CLI adapter — generates .github/skills/, .github/atta/agents/, and AGENTS.md.
 *
 * Copilot CLI reads SKILL.md files with the same frontmatter format as Claude Code.
 * Skills are copied to .github/skills/{name}/SKILL.md.
 * Agent definitions are copied to .github/atta/agents/ (NOT .github/agents/ which is
 * reserved for Copilot's native agent system and requires specific YAML frontmatter).
 * AGENTS.md is generated at the project root.
 *
 * All skills use the atta-* namespace (e.g., /atta-review, /atta-lint) which avoids
 * conflicts with Copilot built-in commands (/review, /agent, /update).
 *
 * Skill frontmatter: Copilot supports name, description, license, disable-model-invocation,
 * and user-invocable at runtime. Other CC-specific fields (allowed-tools, argument-hint,
 * model, context, agent, mode) are stripped to avoid validator warnings.
 */

// COPILOT_SKILL_FIELDS imported from shared.js (single source of truth)

export function install(claudeRoot, attaRoot, targetDir, options = {}) {
  const results = { files: 0 };

  // Generate AGENTS.md with Copilot-specific paths
  const agentsMd = generateAgentsMd(claudeRoot, attaRoot, {
    skillPrefix: '/',
    agentBasePath: '.github/atta/agents',
  });
  writeFileSync(join(targetDir, 'AGENTS.md'), agentsMd);
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} AGENTS.md`);
  }

  // Copy skills to .github/skills/ (all skills already use atta-* namespace)
  const skillsDir = join(claudeRoot, 'skills');
  if (existsSync(skillsDir)) {
    const skills = listSkills(claudeRoot).filter((s) => s.userInvocable !== false);
    checkSkillConflicts(skills, 'copilot', options);
    const githubSkillsDir = join(targetDir, '.github', 'skills');

    const rewriteConfig = {
      agentsPath: '.github/atta/agents',
      memoryPath: '.github/atta/agents/memory',
      commandMap: {},
    };

    for (const skill of skills) {
      const src = join(skillsDir, skill.dirName, 'SKILL.md');
      if (!existsSync(src)) continue;

      const destDir = join(githubSkillsDir, skill.dirName);
      const dest = join(destDir, 'SKILL.md');

      mkdirSync(destDir, { recursive: true });

      let content = readFileSync(src, 'utf-8');

      // Rewrite frontmatter (strip unsupported fields) and body for Copilot compatibility
      const fmMatch = content.match(/^---\n[\s\S]*?\n---\n/);
      if (fmMatch) {
        const frontmatter = fmMatch[0];
        const body = content.slice(frontmatter.length);
        content = filterSkillFrontmatter(frontmatter, COPILOT_SKILL_FIELDS) + rewriteSkillBody(body, rewriteConfig);
      }

      writeFileSync(dest, content);
      results.files++;
    }

    if (!options.quiet) {
      console.log(`  ${pc.green('✓')} .github/skills/ (${skills.length} skills)`);
    }
  }

  // Copy agent definitions to .github/atta/agents/ with Copilot-specific format:
  // - Extension: .agent.md (Copilot ignores plain .md in agent directories)
  // - Frontmatter: name + description only (omit model: inherit — not a Copilot field)
  // - Body: rewrite Claude-isms (paths, commands) for Copilot
  const copilotAgentRewriteConfig = {
    agentsPath: '.github/atta/agents',
    memoryPath: '.github/atta/agents/memory',
    commandMap: {},
  };

  const agentCount = copyAgentFiles(
    claudeRoot,
    join(targetDir, '.github', 'atta', 'agents'),
    {
      ...options,
      extension: '.agent.md',
      transformFrontmatter: (fm) => {
        const result = { name: fm.name, description: fm.description };
        // Copilot supports native tool restriction via tools: [...]
        if (fm.tools) {
          result.tools = mapToolsToCopilot(fm.tools);
        }
        return result;
      },
      transformBody: (body) => rewriteSkillBody(body, copilotAgentRewriteConfig),
    }
  );
  results.files += agentCount;

  if (!options.quiet && agentCount > 0) {
    console.log(
      `  ${pc.green('✓')} .github/atta/agents/ (${agentCount} .agent.md definitions)`
    );
  }

  // Create memory directory with directives placeholder
  createMemoryDirectory(join(targetDir, '.github', 'atta', 'agents'), options);
  results.files++;

  // Generate .github/instructions/ files (Copilot-idiomatic instruction channel)
  const instructionsDir = join(targetDir, '.github', 'instructions');
  mkdirSync(instructionsDir, { recursive: true });

  // Skills instruction file — command reference
  writeFileSync(join(instructionsDir, 'atta-skills.instructions.md'), [
    '# Atta Skills',
    '',
    'This project uses the Atta framework. Skills are in `.github/skills/`.',
    '',
    '## Invocation',
    '',
    'Use `/skill-name` to activate a skill (e.g., `/atta-review`, `/atta-lint`, `/atta-preflight`).',
    'All Atta skills use the `atta-` prefix to avoid conflicts with built-in commands.',
    '',
  ].join('\n'));
  results.files++;

  // Agents instruction file — agent registry
  writeFileSync(join(instructionsDir, 'atta-agents.instructions.md'), [
    '# Atta Agents',
    '',
    'Agent definitions are in `.github/atta/agents/*.agent.md`.',
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
    'Pattern detection artifacts are in `.atta/local/context/`.',
    'Team knowledge is in `.atta/team/` and `.atta/project/`.',
    '',
  ].join('\n'));
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} .github/instructions/ (3 instruction files)`);
  }

  // Generate review guidance (.github/instructions/atta-review.instructions.md)
  const reviewRules = generateReviewRules(attaRoot, options.detectedTechs);
  const reviewContent = formatCopilot(reviewRules);
  writeFileSync(join(instructionsDir, 'atta-review.instructions.md'), reviewContent);
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} .github/instructions/atta-review.instructions.md (review guidance, ${reviewContent.length} chars)`);
  }

  // Generate path-scoped rules (.github/instructions/atta-{tech}.instructions.md + .atta/team/rules/)
  const rules = generateRules(attaRoot, options.detectedTechs);
  if (rules.length > 0) {
    const agnosticCount = writeToolAgnosticRules(targetDir, rules);
    const nativeCount = installCopilotRules(targetDir, rules);
    results.files += agnosticCount + nativeCount;

    if (!options.quiet) {
      console.log(`  ${pc.green('✓')} .atta/team/rules/ (${agnosticCount} rule files)`);
      console.log(`  ${pc.green('✓')} .github/instructions/ (${nativeCount} path-scoped rules)`);
    }
  }

  // Always regenerate hooks.json — enforcement hooks may change with detectedTechs
  const hooksDir = join(targetDir, '.github', 'hooks');
  mkdirSync(hooksDir, { recursive: true });
  const hooksConfig = generateHooks('copilot', options.detectedTechs);
  writeFileSync(join(hooksDir, 'hooks.json'), JSON.stringify(hooksConfig, null, 2) + '\n');
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} .github/hooks/hooks.json (enforcement hooks)`);
  }

  // Write hook scripts for command-type hooks (pre-bash-safety, stop-quality-gate)
  const scriptCount = writeHookScripts(targetDir);
  results.files += scriptCount;
  if (!options.quiet && scriptCount > 0) {
    console.log(`  ${pc.green('✓')} .atta/scripts/hooks/ (${scriptCount} hook scripts)`);
  }

  // Copy shared content to .atta/ (team, project, scripts, metadata)
  const sharedCount = copySharedContent(attaRoot, targetDir, options);
  results.files += sharedCount;

  // Copy bootstrap to .atta/bootstrap/
  const bootstrapCount = copyBootstrap(attaRoot, targetDir, options);
  results.files += bootstrapCount;

  // Copy .github/copilot-instructions.md (instruction file)
  const instructionContent = [
    '# Copilot Instructions',
    '',
    'This project uses the Atta framework for AI-assisted development.',
    'See AGENTS.md for the full agent registry and available commands.',
    '',
    '## Available Skills',
    '',
    'Skills are in `.github/skills/` as SKILL.md files.',
    'All Atta skills use the `atta-` prefix (e.g., `/atta-review`, `/atta-lint`, `/atta-preflight`).',
    '',
    '## Agent Definitions',
    '',
    'Agent definitions: `.github/atta/agents/*.agent.md`',
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

/**
 * Map Claude Code tool names to Copilot tool names.
 * Copilot uses lowercase names: read, edit, search, agent, etc.
 *
 * @param {string[]|string} tools - Claude Code tool names
 * @returns {string[]} Copilot tool names
 */
function mapToolsToCopilot(tools) {
  // Verified against GitHub docs (copilot/reference/custom-agents-configuration.md)
  // Primary aliases: read, edit, search, execute, agent, web, todo
  // Claude Code names (Read, Edit, Grep, etc.) are accepted as aliases (case-insensitive)
  const CC_TO_COPILOT = {
    Read: 'read',
    Edit: 'edit',
    Write: 'edit',     // Write is an alias for edit
    Grep: 'search',
    Glob: 'search',    // Glob is an alias for search
    Bash: 'execute',   // Primary alias (not run_in_terminal)
    Agent: 'agent',
  };

  const list = Array.isArray(tools) ? tools : tools.split(/,\s*/);
  const mapped = new Set();
  for (const tool of list) {
    const copilotName = CC_TO_COPILOT[tool.trim()];
    if (copilotName) mapped.add(copilotName);
  }
  return [...mapped];
}

