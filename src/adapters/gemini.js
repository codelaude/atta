import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { listSkills } from './claude-code.js';
import { generateAgentsMd } from './agents-md.js';
import { copyAgentFiles, copyBootstrap, copySharedContent, rewriteSkillBody, checkSkillConflicts, createMemoryDirectory, generateHooks, writeHookScripts } from './shared.js';
import { generateReviewRules, formatGeminiStyleguide, formatGeminiConfig } from './review-guidance.js';
import { generateRules, writeToolAgnosticRules, installGeminiRules } from './rules-generator.js';

/**
 * Gemini CLI adapter — generates GEMINI.md, .gemini/commands/, and .gemini/agents/.
 *
 * Gemini CLI uses:
 * - GEMINI.md: context file loaded into the model (equivalent to AGENTS.md)
 * - .gemini/commands/*.toml: project-scoped slash commands
 * - .gemini/agents/*.md: agent definition files
 *
 * Skills are converted from SKILL.md → TOML command files.
 * Note: Gemini extensions are global-only (~/.gemini/extensions/),
 * so we don't generate gemini-extension.json at the project level.
 */
export function install(claudeRoot, attaRoot, targetDir, options = {}) {
  const results = { files: 0 };

  // Generate GEMINI.md (same content as AGENTS.md, adapted for Gemini context)
  const geminiMd = generateGeminiMd(claudeRoot, attaRoot);
  writeFileSync(join(targetDir, 'GEMINI.md'), geminiMd);
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} GEMINI.md`);
  }

  // Convert skills to TOML commands at .gemini/commands/
  const skillsDir = join(claudeRoot, 'skills');
  if (existsSync(skillsDir)) {
    const skills = listSkills(claudeRoot).filter((s) => s.userInvocable !== false);
    checkSkillConflicts(skills, 'gemini', options);
    const commandsDir = join(targetDir, '.gemini', 'commands');
    mkdirSync(commandsDir, { recursive: true });

    for (const skill of skills) {
      const skillFile = join(skillsDir, skill.dirName, 'SKILL.md');
      if (!existsSync(skillFile)) continue;

      const toml = skillToToml(skill, skillFile);
      writeFileSync(join(commandsDir, `${skill.dirName}.toml`), toml);
      results.files++;
    }

    if (!options.quiet) {
      console.log(
        `  ${pc.green('✓')} .gemini/commands/ (${skills.length} TOML commands)`
      );
    }
  }

  // Generate review guidance files
  const reviewRules = generateReviewRules(attaRoot, options.detectedTechs);

  // .gemini/styleguide.md — natural language review rules
  const geminiDir = join(targetDir, '.gemini');
  mkdirSync(geminiDir, { recursive: true });
  const styleguideContent = formatGeminiStyleguide(reviewRules);
  writeFileSync(join(geminiDir, 'styleguide.md'), styleguideContent);
  results.files++;

  // .gemini/config.yaml — severity thresholds
  const configContent = formatGeminiConfig();
  writeFileSync(join(geminiDir, 'config.yaml'), configContent);
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} .gemini/styleguide.md + .gemini/config.yaml (review guidance)`);
  }

  // Generate path-scoped rules (merged into .gemini/styleguide.md + .atta/team/rules/)
  const rules = generateRules(attaRoot, options.detectedTechs);
  if (rules.length > 0) {
    const agnosticCount = writeToolAgnosticRules(targetDir, rules);
    installGeminiRules(targetDir, rules);
    results.files += agnosticCount;

    if (!options.quiet) {
      console.log(`  ${pc.green('✓')} .atta/team/rules/ (${agnosticCount} rule files)`);
      console.log(`  ${pc.green('✓')} .gemini/styleguide.md (appended coding rules)`);
    }
  }

  // Copy agent definitions to .gemini/agents/ with Gemini-specific frontmatter:
  // - name + description only (model: inherit is Claude Code-specific)
  // - Body: rewrite paths and resolve {attaDir} placeholders (Gemini is static, no AI resolves them)
  const geminiAgentRewriteConfig = {
    agentsPath: '.gemini/agents',
    memoryPath: '.gemini/agents/memory',
    commandMap: {},
    resolveAttaPlaceholders: true,
  };
  const agentCount = copyAgentFiles(
    claudeRoot,
    join(targetDir, '.gemini', 'agents'),
    {
      ...options,
      transformFrontmatter: (fm) => ({
        name: fm.name,
        description: fm.description,
      }),
      transformBody: (body) => rewriteSkillBody(body, geminiAgentRewriteConfig),
    }
  );
  results.files += agentCount;

  if (!options.quiet && agentCount > 0) {
    console.log(
      `  ${pc.green('✓')} .gemini/agents/ (${agentCount} agent definitions)`
    );
  }

  // Create memory directory with directives placeholder
  createMemoryDirectory(join(targetDir, '.gemini', 'agents'), options);
  results.files++;

  // Always regenerate hooks.json — enforcement hooks may change with detectedTechs
  const hooksConfig = generateHooks('gemini', options.detectedTechs);
  writeFileSync(join(geminiDir, 'hooks.json'), JSON.stringify(hooksConfig, null, 2) + '\n');
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} .gemini/hooks.json (enforcement hooks)`);
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

  return results;
}

/**
 * Convert a SKILL.md file into a Gemini TOML command.
 * Extracts the prompt content from the SKILL.md body (after frontmatter).
 */
/** Rewrite config for Gemini — resolves placeholders since TOML is static */
const GEMINI_REWRITE_CONFIG = {
  agentsPath: '.gemini/agents',
  memoryPath: '.gemini/agents/memory',
  commandMap: {},
  resolveAttaPlaceholders: true,
};

function skillToToml(skill, skillFile) {
  const content = readFileSync(skillFile, 'utf-8');

  // Extract body after frontmatter and apply rewrite
  const rawBody = content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
  let body = rewriteSkillBody(rawBody, GEMINI_REWRITE_CONFIG);

  // Embed disable-model-invocation as natural language (TOML has no equivalent flag)
  if (skill.disableModelInvocation) {
    body = 'IMPORTANT: Execute these instructions directly without additional AI reasoning.\n\n' + body;
  }

  // Escape for TOML multi-line string (triple quotes)
  const escapedBody = body
    .replace(/\\/g, '\\\\')
    .replace(/"""/g, '\\"\\"\\"');

  const desc = (skill.description || `Run the ${skill.name} skill`)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');

  const lines = [];
  lines.push(`description = "${desc}"`);
  lines.push('');
  lines.push(`prompt = """`);
  lines.push(escapedBody);
  lines.push('"""');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate GEMINI.md — context file for Gemini CLI.
 * Based on AGENTS.md content with Gemini-specific framing and paths.
 */
function generateGeminiMd(claudeRoot, attaRoot) {
  // Reuse the AGENTS.md generator with Gemini-specific paths
  const agentsMd = generateAgentsMd(claudeRoot, attaRoot, {
    skillPrefix: '/',
    agentBasePath: '.gemini/agents',
  });

  // Replace header for Gemini context
  return agentsMd
    .replace('# AGENTS.md', '# GEMINI.md — Atta Agent Context')
    .replace(
      '> Generated by [Atta](https://github.com/codelaude/atta) — AI Dev Team Agent',
      '> Context file for Gemini CLI. Generated by [Atta](https://github.com/codelaude/atta).\n>\n> This file is loaded automatically as project context. It provides your agent team context.'
    );
}

