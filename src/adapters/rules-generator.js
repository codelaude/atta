import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { extractFromTemplate, formatTechName, TECH_TO_TEMPLATE } from './review-guidance.js';

/**
 * Path-scoped rules generation — extracts Key Rules and Anti-Patterns from
 * pattern templates and maps them to file globs for each tool's native format.
 *
 * Data flow:
 *   Pattern templates (.atta/bootstrap/templates/patterns/)
 *     + Tech detection results
 *       → .atta/team/rules/*.md  (tool-agnostic, committed)
 *         → Per-adapter native format (written during install)
 *
 * Cross-tool support tiers:
 *   Tier 1 (native path-scoping): Claude Code (.claude/rules/), Copilot (.github/instructions/), Cursor (.cursor/rules/)
 *   Tier 2 (hierarchical files): Codex (subdirectory AGENTS.md — simplified to root-level sections)
 *   Tier 3 (monolithic): Gemini (.gemini/styleguide.md — no path scoping)
 */

/**
 * Map technology identifiers to file glob patterns.
 * Used to scope rules to the files they're relevant for.
 * Universal rules (security) use null to indicate "apply everywhere".
 *
 * Known limitation: Framework-specific rules (e.g., nextjs, express, angular) use
 * language-wide globs (e.g., **\/*.ts) because we don't know the project's directory
 * structure at generation time. In a mixed repo, this means framework rules may apply
 * to unrelated files of the same language. A future improvement could let users
 * customize globs in .atta/team/rules/ after generation.
 */
const TECH_TO_GLOBS = {
  typescript:    ['**/*.ts', '**/*.tsx'],
  react:         ['**/*.tsx', '**/*.jsx'],
  vue:           ['**/*.vue'],
  angular:       ['**/*.ts', '**/*.component.ts', '**/*.module.ts'],
  svelte:        ['**/*.svelte'],
  nextjs:        ['**/*.tsx', '**/*.ts', 'app/**/*', 'pages/**/*'],
  express:       ['**/*.js', '**/*.ts'],
  fastapi:       ['**/*.py'],
  django:        ['**/*.py'],
  'spring-boot': ['**/*.java', '**/*.kt'],
  python:        ['**/*.py'],
  go:            ['**/*.go'],
  rust:          ['**/*.rs'],
  java:          ['**/*.java'],
  scss:          ['**/*.scss', '**/*.sass'],
  tailwind:      ['**/*.tsx', '**/*.jsx', '**/*.html', '**/*.vue'],
  accessibility: ['**/*.tsx', '**/*.jsx', '**/*.html', '**/*.vue', '**/*.svelte'],
  testing:       ['**/*.test.*', '**/*.spec.*', '**/__tests__/**/*'],
  'e2e-testing': ['**/*.e2e.*', '**/e2e/**/*', '**/cypress/**/*', '**/playwright/**/*'],
  security:      null, // universal — applies to all files
  database:      ['**/*.sql', '**/migrations/**/*', '**/models/**/*'],
};

/**
 * Generate structured rule objects from detected technologies.
 * Each rule contains content, description, and glob patterns.
 *
 * @param {string} attaRoot - Path to .atta/ source (templates live here)
 * @param {string[]} [detectedTechs] - Array of detected technology identifiers
 * @returns {Array<{ tech: string, name: string, description: string, globs: string[]|null, keyRules: string[], antiPatterns: object[] }>}
 */
export function generateRules(attaRoot, detectedTechs) {
  const templatesDir = join(attaRoot, 'bootstrap', 'templates', 'patterns');

  // Determine which techs to generate rules for
  let techsToProcess;
  if (detectedTechs && detectedTechs.length > 0) {
    techsToProcess = detectedTechs
      .filter((t) => TECH_TO_TEMPLATE[t])
      .map((t) => ({ tech: t, file: TECH_TO_TEMPLATE[t] }));
  } else {
    // Fallback: security and testing only
    techsToProcess = [
      { tech: 'security', file: 'security-patterns' },
      { tech: 'testing', file: 'testing-patterns' },
    ];
  }

  // Always include security if not already present
  if (!techsToProcess.some((t) => t.tech === 'security')) {
    techsToProcess.push({ tech: 'security', file: 'security-patterns' });
  }

  const rules = [];
  for (const { tech, file } of techsToProcess) {
    const templatePath = join(templatesDir, `${file}.template.md`);
    if (!existsSync(templatePath)) continue;

    const { keyRules, antiPatterns } = extractFromTemplate(templatePath);
    if (keyRules.length === 0 && antiPatterns.length === 0) continue;

    rules.push({
      tech,
      name: formatTechName(tech),
      description: `${formatTechName(tech)} coding patterns and conventions`,
      globs: TECH_TO_GLOBS[tech] || null,
      keyRules,
      antiPatterns,
    });
  }

  return rules;
}

/**
 * Write tool-agnostic rule files to .atta/team/rules/.
 * These are the source-of-truth files that adapters read from.
 *
 * @param {string} targetDir - Project root
 * @param {Array} rules - Rule objects from generateRules()
 * @returns {number} Number of files written
 */
export function writeToolAgnosticRules(targetDir, rules) {
  const rulesDir = join(targetDir, '.atta', 'team', 'rules');
  mkdirSync(rulesDir, { recursive: true });

  // Remove stale rules from previous runs (techs may have changed)
  const knownTechs = new Set(Object.keys(TECH_TO_TEMPLATE));
  for (const file of readdirSync(rulesDir)) {
    if (!file.endsWith('-rules.md')) continue;
    const tech = file.slice(0, file.length - '-rules.md'.length);
    if (knownTechs.has(tech)) {
      unlinkSync(join(rulesDir, file));
    }
  }

  let count = 0;
  for (const rule of rules) {
    const fileName = `${rule.tech}-rules.md`;
    const filePath = join(rulesDir, fileName);

    const lines = ['---'];
    lines.push(`description: "${rule.description}"`);
    if (rule.globs) {
      lines.push('globs:');
      for (const glob of rule.globs) {
        lines.push(`  - "${glob}"`);
      }
    } else {
      lines.push('globs: null');
    }
    lines.push(`source: ${rule.tech}`);
    lines.push('---', '');
    lines.push(`# ${rule.name} Rules`, '');

    if (rule.keyRules.length > 0) {
      lines.push('## Key Rules', '');
      for (const r of rule.keyRules) {
        lines.push(`- ${r}`);
      }
      lines.push('');
    }

    if (rule.antiPatterns.length > 0) {
      lines.push('## Anti-Patterns', '');
      for (const ap of rule.antiPatterns) {
        lines.push(`- **${ap.see}** → ${ap.do} (${ap.severity})`);
      }
      lines.push('');
    }

    writeFileSync(filePath, lines.join('\n'));
    count++;
  }

  return count;
}

// ─── Per-Adapter Formatters ─────────────────────────────────────────

/**
 * Format rules as Claude Code .claude/rules/*.md files.
 * Uses `paths:` frontmatter for path scoping (verified against official docs).
 *
 * @param {string} targetDir - Project root
 * @param {Array} rules - Rule objects from generateRules()
 * @returns {number} Number of files written
 */
export function installClaudeCodeRules(targetDir, rules) {
  const rulesDir = join(targetDir, '.claude', 'rules');
  mkdirSync(rulesDir, { recursive: true });
  cleanStaleRules(rulesDir, 'atta-', '.md');

  let count = 0;
  for (const rule of rules) {
    const fileName = `atta-${rule.tech}.md`;
    const filePath = join(rulesDir, fileName);

    const lines = [];

    // Path-scoped rules use `paths:` frontmatter; universal rules have no frontmatter
    if (rule.globs) {
      lines.push('---');
      lines.push('paths:');
      for (const glob of rule.globs) {
        lines.push(`  - "${glob}"`);
      }
      lines.push('---');
      lines.push('');
    }

    lines.push(`# ${rule.name} Rules`, '');
    appendRuleContent(lines, rule);

    writeFileSync(filePath, lines.join('\n'));
    count++;
  }

  return count;
}

/**
 * Format rules as Copilot .github/instructions/*.instructions.md files.
 * Uses `applyTo:` frontmatter for path scoping (verified against GitHub docs).
 * Supports `excludeAgent:` for separating review vs coding agent instructions.
 *
 * @param {string} targetDir - Project root
 * @param {Array} rules - Rule objects from generateRules()
 * @returns {number} Number of files written
 */
export function installCopilotRules(targetDir, rules) {
  const instructionsDir = join(targetDir, '.github', 'instructions');
  mkdirSync(instructionsDir, { recursive: true });
  cleanStaleRules(instructionsDir, 'atta-', '.instructions.md');

  let count = 0;
  for (const rule of rules) {
    const fileName = `atta-${rule.tech}.instructions.md`;
    const filePath = join(instructionsDir, fileName);

    const lines = ['---'];
    if (rule.globs) {
      lines.push(`applyTo: "${rule.globs.join(',')}"`);
    } else {
      lines.push('applyTo: "**"');
    }
    lines.push('---');
    lines.push('');
    lines.push(`# ${rule.name} Rules`, '');
    appendRuleContent(lines, rule);

    writeFileSync(filePath, lines.join('\n'));
    count++;
  }

  return count;
}

/**
 * Format rules as Cursor .cursor/rules/*.mdc files.
 * Uses `description:`, `globs:`, `alwaysApply:` MDC frontmatter (verified against Cursor docs).
 *
 * @param {string} targetDir - Project root
 * @param {Array} rules - Rule objects from generateRules()
 * @returns {number} Number of files written
 */
export function installCursorRules(targetDir, rules) {
  const rulesDir = join(targetDir, '.cursor', 'rules');
  mkdirSync(rulesDir, { recursive: true });
  cleanStaleRules(rulesDir, 'atta-', '.mdc');

  let count = 0;
  for (const rule of rules) {
    const fileName = `atta-${rule.tech}.mdc`;
    const filePath = join(rulesDir, fileName);

    const lines = ['---'];
    lines.push(`description: "${rule.description}"`);
    if (rule.globs) {
      lines.push('globs:');
      for (const glob of rule.globs) {
        lines.push(`  - "${glob}"`);
      }
      lines.push('alwaysApply: false');
    } else {
      lines.push('globs: []');
      lines.push('alwaysApply: true');
    }
    lines.push('---');
    lines.push('');
    lines.push(`# ${rule.name} Rules`, '');
    appendRuleContent(lines, rule);

    writeFileSync(filePath, lines.join('\n'));
    count++;
  }

  return count;
}

/**
 * Format rules as sections appended to Codex AGENTS.md.
 * Codex uses hierarchical AGENTS.md files with no frontmatter (verified against OpenAI docs).
 * Rules are appended as tech-specific sections to the root AGENTS.md.
 *
 * @param {string} targetDir - Project root
 * @param {Array} rules - Rule objects from generateRules()
 * @returns {number} Number of sections appended (0 or 1 for the combined block)
 */
export function installCodexRules(targetDir, rules) {
  const agentsMdPath = join(targetDir, 'AGENTS.md');
  if (!existsSync(agentsMdPath)) return 0;

  let content = readFileSync(agentsMdPath, 'utf-8');

  // Idempotent: remove existing rules section if present
  const sentinel = '## Coding Rules';
  const sentinelIdx = content.indexOf(sentinel);
  if (sentinelIdx !== -1) {
    content = content.slice(0, sentinelIdx).trimEnd();
  }

  const lines = ['', '', sentinel, ''];

  for (const rule of rules) {
    lines.push(`### ${rule.name}`, '');
    appendRuleContent(lines, rule);
  }

  writeFileSync(agentsMdPath, content + lines.join('\n'));
  return 1;
}

/**
 * Format rules merged into Gemini .gemini/styleguide.md.
 * Gemini has no path-scoping support — all rules are monolithic (verified against Google docs).
 * Appends a coding rules section to the existing styleguide.
 *
 * @param {string} targetDir - Project root
 * @param {Array} rules - Rule objects from generateRules()
 * @returns {number} 0 or 1
 */
export function installGeminiRules(targetDir, rules) {
  const styleguideDir = join(targetDir, '.gemini');
  mkdirSync(styleguideDir, { recursive: true });

  const styleguidePath = join(styleguideDir, 'styleguide.md');
  let content = existsSync(styleguidePath) ? readFileSync(styleguidePath, 'utf-8') : '';

  // Idempotent: remove existing coding rules section
  const sentinel = '## Coding Rules';
  const sentinelIdx = content.indexOf(sentinel);
  if (sentinelIdx !== -1) {
    content = content.slice(0, sentinelIdx).trimEnd();
  }

  const lines = ['', '', sentinel, ''];

  for (const rule of rules) {
    lines.push(`### ${rule.name}`, '');
    // Only include top 5 key rules per tech to keep file manageable
    const topRules = rule.keyRules.slice(0, 5);
    for (const r of topRules) {
      lines.push(`- ${r}`);
    }
    const critical = rule.antiPatterns.filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH');
    if (critical.length > 0) {
      lines.push('');
      lines.push('**Flag these patterns:**');
      for (const ap of critical) {
        lines.push(`- ${ap.see} → ${ap.do}`);
      }
    }
    lines.push('');
  }

  writeFileSync(styleguidePath, content + lines.join('\n'));
  return 1;
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Remove stale Atta-generated rule files from a directory.
 * Only removes files whose tech name (extracted from filename) is in TECH_TO_TEMPLATE,
 * so non-rule files (e.g., atta-review.instructions.md from copilot.js) are preserved.
 *
 * @param {string} dir - Directory to clean
 * @param {string} prefix - File prefix before tech name (e.g., 'atta-')
 * @param {string} suffix - File suffix after tech name (e.g., '.md', '.mdc', '.instructions.md')
 */
function cleanStaleRules(dir, prefix, suffix) {
  if (!existsSync(dir)) return;
  const knownTechs = new Set(Object.keys(TECH_TO_TEMPLATE));
  for (const file of readdirSync(dir)) {
    if (!file.startsWith(prefix) || !file.endsWith(suffix)) continue;
    // Extract tech name: remove prefix and suffix
    const tech = file.slice(prefix.length, file.length - suffix.length);
    if (knownTechs.has(tech)) {
      unlinkSync(join(dir, file));
    }
  }
}

/**
 * Append key rules and anti-patterns to a lines array.
 * Shared by all formatters for consistent content.
 */
function appendRuleContent(lines, rule) {
  if (rule.keyRules.length > 0) {
    for (const r of rule.keyRules) {
      lines.push(`- ${r}`);
    }
    lines.push('');
  }

  const important = rule.antiPatterns.filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH');
  if (important.length > 0) {
    lines.push('**Anti-patterns to avoid:**');
    for (const ap of important) {
      lines.push(`- ${ap.see} → ${ap.do}`);
    }
    lines.push('');
  }
}
