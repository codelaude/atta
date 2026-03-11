import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Review guidance generation — extracts Key Rules and Anti-Patterns from
 * pattern templates and formats them into each tool's native review format.
 *
 * Pattern templates live at .atta/bootstrap/templates/patterns/*.template.md
 * and have consistent structure:
 *   ## Key Rules       — bullet-point rules with ### subsections
 *   ## Anti-Patterns   — table: | I See | I Do | Severity |
 *
 * Each tool has a different native review guidance format:
 *   Claude Code  → REVIEW.md (markdown, severity emoji)
 *   Copilot      → .github/instructions/atta-review.instructions.md (4K char limit)
 *   Cursor       → .cursor/BUGBOT.md + .cursor/rules/atta-review.mdc
 *   Codex        → ## Review Guidelines section appended to AGENTS.md
 *   Gemini       → .gemini/styleguide.md + .gemini/config.yaml
 *   CI Review    → additional context for the review prompt
 */

/**
 * Map technology detection names to pattern template filenames.
 * Keys are the tech identifiers used in detection YAML; values are template basenames.
 */
const TECH_TO_TEMPLATE = {
  typescript: 'typescript-patterns',
  react: 'react-patterns',
  vue: 'vue-patterns',
  angular: 'angular-patterns',
  svelte: 'svelte-patterns',
  nextjs: 'nextjs-patterns',
  express: 'express-patterns',
  fastapi: 'fastapi-patterns',
  django: 'django-patterns',
  'spring-boot': 'spring-boot-patterns',
  python: 'python-patterns',
  go: 'go-patterns',
  rust: 'rust-patterns',
  java: 'java-patterns',
  scss: 'scss-patterns',
  tailwind: 'tailwind-patterns',
  accessibility: 'accessibility-patterns',
  testing: 'testing-patterns',
  'e2e-testing': 'e2e-testing-patterns',
  security: 'security-patterns',
  database: 'database-patterns',
};

/**
 * Extract Key Rules and Anti-Patterns from a pattern template file.
 *
 * @param {string} templatePath - Absolute path to a pattern template .md file
 * @returns {{ keyRules: string[], antiPatterns: Array<{see: string, do: string, severity: string}> }}
 */
function extractFromTemplate(templatePath) {
  const content = readFileSync(templatePath, 'utf-8');
  const keyRules = [];
  const antiPatterns = [];

  // Extract Key Rules section (everything between ## Key Rules and next ## heading)
  const keyRulesMatch = content.match(/## Key Rules\n([\s\S]*?)(?=\n## [A-Z])/);
  if (keyRulesMatch) {
    const rulesBlock = keyRulesMatch[1];
    // Extract bullet points (- Rule text), skip ### headers and blank lines
    for (const line of rulesBlock.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        keyRules.push(trimmed.slice(2));
      }
    }
  }

  // Extract Anti-Patterns table rows (handles both "## Anti-Patterns" and "## Anti-Patterns to Flag")
  const antiPatternsMatch = content.match(/## Anti-Patterns(?:\s+to\s+Flag)?\n([\s\S]*?)(?=\n## [A-Z]|\n<!--|\n$)/);
  if (antiPatternsMatch) {
    const tableBlock = antiPatternsMatch[1];
    for (const line of tableBlock.split('\n')) {
      const trimmed = line.trim();
      // Skip header row and separator
      if (!trimmed.startsWith('|') || trimmed.includes('---') || trimmed.includes('I See')) continue;
      // Split on unescaped pipes only (handles \| inside cells like `\|\|`)
      const cols = trimmed.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim()).filter(Boolean);
      if (cols.length >= 3) {
        antiPatterns.push({
          see: cols[0],
          do: cols[1],
          severity: cols[2].toUpperCase(),
        });
      }
    }
  }

  return { keyRules, antiPatterns };
}

/**
 * Generate structured review rules from detected technologies.
 * Reads pattern templates and extracts rules grouped by technology.
 *
 * @param {string} attaRoot - Path to .atta/ source (templates live here)
 * @param {string[]} [detectedTechs] - Array of detected technology identifiers.
 *   If empty/undefined, scans all available templates.
 * @returns {{ universal: object, techRules: Array<{tech: string, keyRules: string[], antiPatterns: object[]}> }}
 */
export function generateReviewRules(attaRoot, detectedTechs) {
  const templatesDir = join(attaRoot, 'bootstrap', 'templates', 'patterns');

  // Read universal rules from the review guidance template
  const universalTemplate = join(attaRoot, 'bootstrap', 'templates', 'review-guidance.template.md');
  const universal = { alwaysCheck: [], style: [], skip: [] };

  if (existsSync(universalTemplate)) {
    const content = readFileSync(universalTemplate, 'utf-8');

    // Extract Always Check section
    const alwaysMatch = content.match(/## Always Check \(Universal\)\n([\s\S]*?)(?=\n## )/);
    if (alwaysMatch) {
      for (const line of alwaysMatch[1].split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ')) universal.alwaysCheck.push(trimmed.slice(2));
      }
    }

    // Extract Style section
    const styleMatch = content.match(/## Style \(Universal\)\n([\s\S]*?)(?=\n## )/);
    if (styleMatch) {
      for (const line of styleMatch[1].split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ')) universal.style.push(trimmed.slice(2));
      }
    }

    // Extract Skip section
    const skipMatch = content.match(/## Skip \(Universal\)\n([\s\S]*?)$/);
    if (skipMatch) {
      for (const line of skipMatch[1].split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ')) universal.skip.push(trimmed.slice(2));
      }
    }
  }

  // Determine which templates to read
  let techsToProcess;
  if (detectedTechs && detectedTechs.length > 0) {
    techsToProcess = detectedTechs
      .filter((t) => TECH_TO_TEMPLATE[t])
      .map((t) => ({ tech: t, file: TECH_TO_TEMPLATE[t] }));
  } else {
    // Fallback: scan available templates (init without detection runs this path)
    techsToProcess = [];
    if (existsSync(templatesDir)) {
      for (const f of readdirSync(templatesDir)) {
        if (!f.endsWith('.template.md')) continue;
        const techName = f.replace('-patterns.template.md', '').replace('.template.md', '');
        // Skip review-guidance template itself
        if (techName === 'review-guidance') continue;
        // Only include security and testing as universal fallbacks
        if (['security', 'testing'].includes(techName)) {
          techsToProcess.push({ tech: techName, file: f.replace('.template.md', '') });
        }
      }
    }
  }

  // Always include security if not already present
  if (!techsToProcess.some((t) => t.tech === 'security')) {
    techsToProcess.push({ tech: 'security', file: 'security-patterns' });
  }

  // Extract rules from each template
  const techRules = [];
  for (const { tech, file } of techsToProcess) {
    const templatePath = join(templatesDir, `${file}.template.md`);
    if (!existsSync(templatePath)) continue;

    const { keyRules, antiPatterns } = extractFromTemplate(templatePath);
    if (keyRules.length > 0 || antiPatterns.length > 0) {
      techRules.push({ tech, keyRules, antiPatterns });
    }
  }

  return { universal, techRules };
}

// ─── Per-Tool Formatters ────────────────────────────────────────────

/**
 * Format review rules as Claude Code REVIEW.md.
 * Sections: ## Always check, ## Style, ## Skip, ## {Tech} (per detected tech)
 * Severity: 🔴 (CRITICAL/HIGH), 🟡 (MEDIUM), skip LOW
 */
export function formatClaudeCode(rules) {
  const lines = ['# Code Review Guidance', ''];

  // Always check
  lines.push('## Always check', '');
  for (const rule of rules.universal.alwaysCheck) {
    lines.push(`- ${rule}`);
  }
  lines.push('');

  // Tech-specific rules (anti-patterns as review items)
  for (const { tech, antiPatterns } of rules.techRules) {
    const critical = antiPatterns.filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH');
    if (critical.length === 0) continue;

    lines.push(`### ${formatTechName(tech)}`, '');
    for (const ap of critical) {
      const emoji = ap.severity === 'CRITICAL' ? '🔴' : '🔴';
      lines.push(`- ${emoji} ${ap.see} → ${ap.do}`);
    }
    lines.push('');
  }

  // Style
  lines.push('## Style', '');
  for (const rule of rules.universal.style) {
    lines.push(`- 🟡 ${rule}`);
  }
  // Add MEDIUM anti-patterns as style nits
  for (const { antiPatterns } of rules.techRules) {
    const medium = antiPatterns.filter((a) => a.severity === 'MEDIUM');
    for (const ap of medium) {
      lines.push(`- 🟡 ${ap.see} → ${ap.do}`);
    }
  }
  lines.push('');

  // Skip
  lines.push('## Skip', '');
  for (const rule of rules.universal.skip) {
    lines.push(`- ${rule}`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Format review rules as Copilot instructions file.
 * MUST stay under 4,000 characters. Distill to the most critical rules.
 *
 * @returns {string} Full instructions file content (frontmatter + body)
 */
export function formatCopilot(rules) {
  const lines = [];

  // YAML frontmatter with applyTo globs
  lines.push('---');
  lines.push('applyTo: "**"');
  lines.push('---');
  lines.push('');
  lines.push('# Review Rules');
  lines.push('');

  // Always check (keep concise)
  lines.push('## Always Check');
  for (const rule of rules.universal.alwaysCheck) {
    lines.push(`- ${rule}`);
  }
  lines.push('');

  // Only CRITICAL anti-patterns (4K budget is tight)
  const criticals = [];
  for (const { tech, antiPatterns } of rules.techRules) {
    for (const ap of antiPatterns) {
      if (ap.severity === 'CRITICAL') {
        criticals.push({ tech, ...ap });
      }
    }
  }

  if (criticals.length > 0) {
    lines.push('## Critical Issues');
    for (const c of criticals) {
      lines.push(`- **${c.see}**: ${c.do}`);
    }
    lines.push('');
  }

  // Skip paths (concise)
  lines.push('## Skip');
  // Only include the most common skip paths to save chars
  lines.push('- `dist/`, `build/`, `node_modules/`, `vendor/`, `*.min.js`, lock files');
  lines.push('');

  let result = lines.join('\n');

  // Enforce 4K char limit — trim from bottom if needed
  if (result.length > 4000) {
    result = result.slice(0, 3950) + '\n\n<!-- Truncated to 4K char limit -->\n';
  }

  return result;
}

/**
 * Format review rules as Cursor BUGBOT.md.
 * Uses conditional rule format: "If X, then: Y"
 * Supports blocking (CRITICAL/HIGH) vs non-blocking (MEDIUM) findings.
 */
export function formatCursorBugbot(rules) {
  const lines = ['# BugBot Review Rules', ''];

  // Blocking rules (CRITICAL/HIGH)
  lines.push('## Blocking', '');
  for (const rule of rules.universal.alwaysCheck) {
    lines.push(`- If ${rule.toLowerCase().replace(/^no /, 'there are ')}, then: Flag as blocking.`);
  }
  for (const { antiPatterns } of rules.techRules) {
    for (const ap of antiPatterns) {
      if (ap.severity === 'CRITICAL' || ap.severity === 'HIGH') {
        lines.push(`- If you see ${ap.see.toLowerCase()}, then: ${ap.do}. [blocking]`);
      }
    }
  }
  lines.push('');

  // Non-blocking rules (MEDIUM)
  lines.push('## Non-blocking', '');
  for (const rule of rules.universal.style) {
    lines.push(`- If ${rule.toLowerCase()}, then: Suggest fix. [non-blocking]`);
  }
  for (const { antiPatterns } of rules.techRules) {
    for (const ap of antiPatterns) {
      if (ap.severity === 'MEDIUM') {
        lines.push(`- If you see ${ap.see.toLowerCase()}, then: ${ap.do}. [non-blocking]`);
      }
    }
  }
  lines.push('');

  // Skip
  lines.push('## Ignore', '');
  for (const rule of rules.universal.skip) {
    lines.push(`- ${rule}`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Format review rules as Cursor MDC rule (for agent/chat context).
 */
export function formatCursorMdc(rules) {
  const lines = [];

  lines.push('---');
  lines.push('description: Stack-specific code review rules from Atta');
  lines.push('globs: []');
  lines.push('alwaysApply: false');
  lines.push('---');
  lines.push('');
  lines.push('# Review Guidelines');
  lines.push('');

  lines.push('## Always Check');
  for (const rule of rules.universal.alwaysCheck) {
    lines.push(`- ${rule}`);
  }
  lines.push('');

  for (const { tech, antiPatterns } of rules.techRules) {
    const important = antiPatterns.filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH');
    if (important.length === 0) continue;
    lines.push(`### ${formatTechName(tech)}`);
    for (const ap of important) {
      lines.push(`- ${ap.see} → ${ap.do} (${ap.severity})`);
    }
    lines.push('');
  }

  lines.push('## Style');
  for (const rule of rules.universal.style) {
    lines.push(`- ${rule}`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Format review rules as a section to append to AGENTS.md for Codex.
 * Codex uses P0 (critical) / P1 (high) severity by default.
 */
export function formatCodex(rules) {
  const lines = ['', '## Review Guidelines', ''];

  lines.push('### P0 — Always flag');
  for (const rule of rules.universal.alwaysCheck) {
    lines.push(`- ${rule}`);
  }
  for (const { antiPatterns } of rules.techRules) {
    for (const ap of antiPatterns) {
      if (ap.severity === 'CRITICAL') {
        lines.push(`- ${ap.see} → ${ap.do}`);
      }
    }
  }
  lines.push('');

  lines.push('### P1 — Flag when significant');
  for (const { antiPatterns } of rules.techRules) {
    for (const ap of antiPatterns) {
      if (ap.severity === 'HIGH') {
        lines.push(`- ${ap.see} → ${ap.do}`);
      }
    }
  }
  lines.push('');

  lines.push('### Skip');
  lines.push('- Generated files, lock files, vendored dependencies, minified assets');
  lines.push('');

  return lines.join('\n');
}

/**
 * Format review rules as Gemini styleguide.md.
 * Natural language review rules.
 */
export function formatGeminiStyleguide(rules) {
  const lines = ['# Code Review Style Guide', ''];

  lines.push('## Always Check');
  for (const rule of rules.universal.alwaysCheck) {
    lines.push(`- ${rule}`);
  }
  lines.push('');

  for (const { tech, keyRules, antiPatterns } of rules.techRules) {
    // Include top key rules (max 5 per tech to keep it readable)
    const topRules = keyRules.slice(0, 5);
    const criticalAPs = antiPatterns.filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH');

    if (topRules.length === 0 && criticalAPs.length === 0) continue;

    lines.push(`## ${formatTechName(tech)}`);
    if (topRules.length > 0) {
      for (const rule of topRules) {
        lines.push(`- ${rule}`);
      }
    }
    if (criticalAPs.length > 0) {
      lines.push('');
      lines.push('**Flag these patterns:**');
      for (const ap of criticalAPs) {
        lines.push(`- ${ap.see} → ${ap.do}`);
      }
    }
    lines.push('');
  }

  lines.push('## Style');
  for (const rule of rules.universal.style) {
    lines.push(`- ${rule}`);
  }
  lines.push('');

  lines.push('## Skip');
  for (const rule of rules.universal.skip) {
    lines.push(`- ${rule}`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate Gemini config.yaml with severity thresholds.
 */
export function formatGeminiConfig() {
  return [
    '# Gemini Code Assist Configuration',
    '# Generated by Atta — https://github.com/codelaude/atta',
    '',
    'code_review:',
    '  comment_severity_threshold: MEDIUM',
    '  max_review_comments: 20',
    '',
  ].join('\n');
}

/**
 * Format review rules as additional context for CI review prompts.
 * Returns a string to be appended to the prompt body.
 */
export function formatCIReview(rules) {
  const lines = ['', '**Stack-specific review rules (from Atta detection):**', ''];

  for (const { tech, antiPatterns } of rules.techRules) {
    const critical = antiPatterns.filter((a) => a.severity === 'CRITICAL');
    if (critical.length === 0) continue;
    lines.push(`${formatTechName(tech)}:`);
    for (const ap of critical) {
      lines.push(`- ${ap.see} → ${ap.do}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Convert tech identifier to display name (e.g., 'spring-boot' → 'Spring Boot') */
function formatTechName(tech) {
  const special = {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    react: 'React',
    vue: 'Vue',
    angular: 'Angular',
    svelte: 'Svelte',
    nextjs: 'Next.js',
    express: 'Express',
    fastapi: 'FastAPI',
    django: 'Django',
    'spring-boot': 'Spring Boot',
    python: 'Python',
    go: 'Go',
    rust: 'Rust',
    java: 'Java',
    scss: 'SCSS',
    tailwind: 'Tailwind CSS',
    accessibility: 'Accessibility',
    testing: 'Testing',
    'e2e-testing': 'E2E Testing',
    security: 'Security',
    database: 'Database',
  };
  return special[tech] || tech.charAt(0).toUpperCase() + tech.slice(1).replace(/-/g, ' ');
}
