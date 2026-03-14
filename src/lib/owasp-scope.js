import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * OWASP Top 10 (2025) scope generator — maps detected tech stacks to
 * applicable OWASP categories and writes a pre-computed scope file.
 *
 * Tech-agnostic: project type classification is derived from the detection
 * YAML files (frontend, backend, database detectors) — not hardcoded.
 * Any tech in those three detector files is automatically classified.
 * Tool/security/architectural detectors are not mapped to OWASP types.
 *
 * The scope file (.atta/team/owasp-scope.md) is read by:
 *   - CI reviewers (github-action adapter prompt)
 *   - /atta-security-audit skill (future)
 *   - Local review tools (future)
 *
 * Categories follow OWASP Top 10 (2025) numbering:
 *   A01: Broken Access Control
 *   A02: Security Misconfiguration
 *   A03: Software Supply Chain Failures
 *   A04: Cryptographic Failures
 *   A05: Injection
 *   A06: Insecure Design
 *   A07: Authentication Failures
 *   A08: Software or Data Integrity Failures
 *   A09: Security Logging & Alerting Failures
 *   A10: Mishandling of Exceptional Conditions
 */

/**
 * All OWASP Top 10 (2025) categories with descriptions.
 */
const OWASP_CATEGORIES = {
  A01: 'Broken Access Control',
  A02: 'Security Misconfiguration',
  A03: 'Software Supply Chain Failures',
  A04: 'Cryptographic Failures',
  A05: 'Injection',
  A06: 'Insecure Design',
  A07: 'Authentication Failures',
  A08: 'Software or Data Integrity Failures',
  A09: 'Security Logging & Alerting Failures',
  A10: 'Mishandling of Exceptional Conditions',
};

/**
 * Map detection YAML filenames to OWASP project types.
 * This is the ONLY mapping maintained here — individual tech names
 * are read from the YAML files at runtime, not hardcoded.
 */
const DETECTOR_FILE_TO_TYPE = {
  'frontend-detectors.yaml': 'frontend',
  'backend-detectors.yaml': 'backend',
  'database-detectors.yaml': 'backend', // database techs have backend-equivalent OWASP surface
  // tool-detectors.yaml and security-tools.yaml don't map to OWASP project types
  // architectural-detectors.yaml is handled separately (microservices, monorepo)
};

/**
 * Additional project type scopes that can be inferred but aren't directly
 * from a detector YAML file. These are applied when no frontend/backend
 * techs are detected AND the project has structural signals.
 *
 * cli/library/staticSite are NOT auto-detected from the YAML detectors —
 * they require heuristics (e.g., package.json `bin` field for CLI,
 * no web techs for library). When none of these signals match,
 * the conservative 'backend' default applies (all OWASP categories).
 */

/**
 * OWASP category relevance per project type.
 * Values: 'high' (primary risk), 'medium' (conditional), 'low' (deprioritize), 'skip' (N/A)
 *
 * Verified against OWASP official docs (2025), OWASP ASVS, API Security Top 10,
 * and Microservices Security Cheat Sheet.
 */
const SCOPE_BY_TYPE = {
  backend: {
    A01: { level: 'high', note: 'Server-side authz on every endpoint — IDOR, privilege escalation' },
    A02: { level: 'high', note: 'Default configs, verbose errors, missing security headers, CORS' },
    A03: { level: 'high', note: 'Server-side dependency trees are direct attack surface' },
    A04: { level: 'high', note: 'TLS, password hashing, token generation, data-at-rest encryption' },
    A05: { level: 'high', note: 'SQL/NoSQL/OS command injection — parameterized queries required' },
    A06: { level: 'high', note: 'Rate limiting, abuse-case modeling, business logic validation' },
    A07: { level: 'high', note: 'Session management, JWT validation, password policies, MFA' },
    A08: { level: 'high', note: 'Deserialization attacks, unsigned updates, CI/CD pipeline security' },
    A09: { level: 'high', note: 'Audit trails, breach detection, auth event logging' },
    A10: { level: 'high', note: 'Error handling, resource cleanup, graceful degradation' },
  },
  frontend: {
    A01: { level: 'medium', note: 'Client-side route guards are UX only — enforcement is server-side' },
    A02: { level: 'low', note: 'Limited config surface — source maps in prod, exposed API keys in bundle' },
    A03: { level: 'high', note: 'npm dependency trees are notoriously deep — SCA required' },
    A04: { level: 'medium', note: 'HTTPS enforcement, secure cookie flags, no secrets in browser' },
    A05: { level: 'medium', note: 'XSS is the primary vector — dangerouslySetInnerHTML, v-html, innerHTML' },
    A06: { level: 'medium', note: 'Client-side logic can expose business rules' },
    A07: { level: 'medium', note: 'Token storage (localStorage vs httpOnly cookies), PKCE in OAuth' },
    A08: { level: 'medium', note: 'SRI for CDN assets, bundle integrity, CI/CD compromise' },
    A09: { level: 'low', note: 'Client-side logging is limited and easily tampered with' },
    A10: { level: 'low', note: 'Error boundaries for UX, not security-critical' },
  },
  fullstack: {
    A01: { level: 'high', note: 'SSR blurs client/server — server actions and API routes need authz' },
    A02: { level: 'high', note: 'Headers, CORS, cookies, env var exposure risks' },
    A03: { level: 'high', note: 'Both server and client dependency trees' },
    A04: { level: 'high', note: 'Full server-side crypto surface — sessions, credentials, TLS' },
    A05: { level: 'high', note: 'Server-side + client-side injection vectors, template injection' },
    A06: { level: 'high', note: 'Rate limiting, CSRF for server actions, abuse-case modeling' },
    A07: { level: 'high', note: 'Session management complexity — server sessions vs stateless tokens' },
    A08: { level: 'high', note: 'Server action serialization, CI/CD, dependency integrity' },
    A09: { level: 'high', note: 'Full server-side logging capability and responsibility' },
    A10: { level: 'high', note: 'Server-side error handling, resource cleanup, circuit breakers' },
  },
  cli: {
    A01: { level: 'low', note: 'No HTTP endpoints — access control is OS-level' },
    A02: { level: 'medium', note: 'Default config files, insecure temp files, permission issues' },
    A03: { level: 'high', note: 'Dependencies with known CVEs apply regardless of project type' },
    A04: { level: 'medium', note: 'Relevant if handling secrets, tokens, or encrypted data' },
    A05: { level: 'high', note: 'Command injection (CWE-78) and path traversal (CWE-22) are primary risks' },
    A06: { level: 'medium', note: 'Privilege boundaries, trust boundaries for input sources' },
    A07: { level: 'low', note: 'CLIs rarely implement auth — relevant if storing tokens' },
    A08: { level: 'high', note: 'Supply chain attacks, unsigned packages, lockfile integrity' },
    A09: { level: 'low', note: 'CLIs log to stdout/stderr — no centralized monitoring' },
    A10: { level: 'medium', note: 'Proper exit codes, resource cleanup, signal handling' },
  },
  library: {
    A01: { level: 'skip', note: 'Libraries have no access control surface' },
    A02: { level: 'low', note: 'Default export configs — minimal surface' },
    A03: { level: 'high', note: 'Critical — supply chain attacks target popular libraries' },
    A04: { level: 'medium', note: 'If the library implements or wraps crypto: HIGH' },
    A05: { level: 'medium', note: 'If the library processes user input (parsing, templating): HIGH' },
    A06: { level: 'medium', note: 'API design should prevent misuse by consumers' },
    A07: { level: 'skip', note: 'Libraries have no authentication surface' },
    A08: { level: 'high', note: 'Package signing, release integrity, CI/CD security' },
    A09: { level: 'skip', note: 'Libraries have no logging surface' },
    A10: { level: 'high', note: 'Proper error propagation, no swallowed exceptions' },
  },
  staticSite: {
    A01: { level: 'skip', note: 'No dynamic content, no user sessions' },
    A02: { level: 'medium', note: 'Hosting platform headers, directory listing, .git exposure' },
    A03: { level: 'high', note: 'Static site generators and plugins have dependencies' },
    A04: { level: 'low', note: 'Only HTTPS enforcement on hosting platform' },
    A05: { level: 'skip', note: 'No server-side processing, no database queries' },
    A06: { level: 'low', note: 'Minimal attack surface' },
    A07: { level: 'skip', note: 'No authentication layer' },
    A08: { level: 'medium', note: 'SRI for CDN scripts, CI/CD pipeline integrity' },
    A09: { level: 'low', note: 'Handled by hosting platform' },
    A10: { level: 'skip', note: 'No server-side processing' },
  },
};

/**
 * Extract technology entries from a detection YAML file.
 * Uses simple regex to avoid a YAML parser dependency.
 *
 * Extracts `identifier:` and optional `owasp_type:` from each entry.
 * The YAML structure is block-based: entries start with `- name:` and
 * contain `identifier:` + optional `metadata:` with `owasp_type:`.
 *
 * Known limitation: regex-based extraction assumes unquoted values and no
 * `identifier:` in comments. Verified against actual YAML — all identifiers
 * are unquoted, no comments use `identifier:`.
 *
 * @param {string} filePath - Absolute path to a detection YAML file
 * @returns {Array<{id: string, owaspType: string|null}>} Technology entries
 */
function extractTechEntries(filePath) {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, 'utf-8');

  // Split into per-technology blocks at `- name:` boundaries
  const blocks = content.split(/(?=^\s+-\s+name:)/gm);
  const entries = [];

  for (const block of blocks) {
    const idMatch = block.match(/^\s+identifier:\s*(\S+)/m);
    if (!idMatch) continue;

    const owaspMatch = block.match(/^\s+owasp_type:\s*(\S+)/m);
    entries.push({
      id: idMatch[1],
      owaspType: owaspMatch ? owaspMatch[1] : null,
    });
  }

  return entries;
}

/**
 * Build tech → project type mapping by reading detection YAML files.
 * Derives classification from YAML metadata — no hardcoded tech lists.
 *
 * If a tech has `owasp_type: fullstack` in its YAML metadata, it overrides
 * the file-level category (e.g., a framework in frontend-detectors.yaml
 * can be classified as fullstack for OWASP scoping).
 *
 * @param {string} attaRoot - Path to .atta/ source (detection YAMLs live here)
 * @returns {Map<string, string>} Map of tech identifier → project type
 */
function buildTechTypeMap(attaRoot) {
  const detectionDir = join(attaRoot, 'bootstrap', 'detection');
  const techToType = new Map();

  for (const [fileName, projectType] of Object.entries(DETECTOR_FILE_TO_TYPE)) {
    const entries = extractTechEntries(join(detectionDir, fileName));
    for (const { id, owaspType } of entries) {
      // owasp_type metadata overrides the file-level category
      techToType.set(id, owaspType || projectType);
    }
  }

  return techToType;
}

/**
 * Classify detected technologies into project types.
 * Reads detection YAML files to build the mapping — no hardcoded tech lists.
 *
 * @param {string[]} detectedTechs - Array of detected technology identifiers
 * @param {string} attaRoot - Path to .atta/ source
 * @returns {string[]} Array of project type strings
 */
export function classifyProjectType(detectedTechs, attaRoot) {
  if (!detectedTechs || detectedTechs.length === 0) return ['backend']; // safe default

  const techToType = buildTechTypeMap(attaRoot);
  const types = new Set();

  for (const tech of detectedTechs) {
    const type = techToType.get(tech);
    if (type) types.add(type);
  }

  // Full-stack SSR frameworks count as both frontend and backend
  if (types.has('fullstack')) {
    types.add('frontend');
    types.add('backend');
  }

  // If no recognized types, default to backend (safest — all categories apply)
  if (types.size === 0) return ['backend'];

  return [...types];
}

/**
 * Compute OWASP scope from detected technologies.
 * Merges scopes from all detected project types — higher relevance wins.
 *
 * @param {string[]} detectedTechs - Array of detected technology identifiers
 * @param {string} attaRoot - Path to .atta/ source
 * @returns {{ applicable: Array<{code: string, name: string, level: string, note: string}>, deprioritized: Array<{code: string, name: string, level: string, note: string}>, skipped: Array<{code: string, name: string, reason: string}>, projectTypes: string[] }}
 */
export function computeOwaspScope(detectedTechs, attaRoot) {
  const projectTypes = classifyProjectType(detectedTechs, attaRoot);

  // Merge scopes — highest relevance wins across all detected types
  const LEVEL_PRIORITY = { high: 3, medium: 2, low: 1, skip: 0 };
  const merged = {};

  for (const type of projectTypes) {
    const scope = SCOPE_BY_TYPE[type];
    if (!scope) continue;

    for (const [code, { level, note }] of Object.entries(scope)) {
      const existing = merged[code];
      if (!existing || LEVEL_PRIORITY[level] > LEVEL_PRIORITY[existing.level]) {
        merged[code] = { code, name: OWASP_CATEGORIES[code], level, note };
      }
    }
  }

  // Fill any missing categories with high (conservative default)
  for (const [code, name] of Object.entries(OWASP_CATEGORIES)) {
    if (!merged[code]) {
      merged[code] = { code, name, level: 'high', note: 'Default — not enough info to narrow scope' };
    }
  }

  // Three tiers: applicable (high/medium), deprioritized (low), skipped (N/A)
  // Deprioritized categories are still flagged for clear vulnerabilities —
  // they're lower priority, not invisible.
  const applicable = [];
  const deprioritized = [];
  const skipped = [];

  for (const code of Object.keys(OWASP_CATEGORIES)) {
    const entry = merged[code];
    if (entry.level === 'skip') {
      skipped.push({ code, name: entry.name, reason: entry.note });
    } else if (entry.level === 'low') {
      deprioritized.push({ code, name: entry.name, level: entry.level, note: entry.note });
    } else {
      applicable.push(entry);
    }
  }

  return { applicable, deprioritized, skipped, projectTypes };
}

/**
 * Generate the OWASP scope markdown file content.
 *
 * @param {string[]} detectedTechs - Array of detected technology identifiers
 * @param {string} attaRoot - Path to .atta/ source
 * @returns {string} Markdown content for owasp-scope.md
 */
export function formatOwaspScope(detectedTechs, attaRoot) {
  const { applicable, deprioritized, skipped, projectTypes } = computeOwaspScope(detectedTechs, attaRoot);

  const lines = [
    '# OWASP Scope',
    '',
    '> Pre-computed OWASP Top 10 (2025) scope for this project.',
    '> Generated by Atta from tech detection. The CI reviewer and security audit read this file.',
    '> Re-generate by re-running `npx atta-dev init` (detects stack changes automatically).',
    '',
    `**Project types detected**: ${projectTypes.join(', ')}`,
    '',
  ];

  // Applicable categories (always check)
  lines.push('## Applicable Categories', '');
  lines.push('| Code | Category | Focus |');
  lines.push('|------|----------|-------|');
  for (const { code, name, note } of applicable) {
    lines.push(`| ${code} | ${name} | ${note} |`);
  }
  lines.push('');

  // Deprioritized categories (still flag clear vulnerabilities)
  if (deprioritized.length > 0) {
    lines.push('## Deprioritized (flag only clear vulnerabilities)', '');
    lines.push('| Code | Category | Context |');
    lines.push('|------|----------|---------|');
    for (const { code, name, note } of deprioritized) {
      lines.push(`| ${code} | ${name} | ${note} |`);
    }
    lines.push('');
  }

  // Skipped categories (N/A for this project type)
  if (skipped.length > 0) {
    lines.push('## Skipped (not applicable)', '');
    lines.push('| Code | Category | Reason |');
    lines.push('|------|----------|--------|');
    for (const { code, name, reason } of skipped) {
      lines.push(`| ${code} | ${name} | ${reason} |`);
    }
    lines.push('');
  }

  // Notes
  lines.push('## Notes', '');
  lines.push('- **Applicable**: always checked by CI and security audit');
  lines.push('- **Deprioritized**: lower priority but still flagged for clear vulnerabilities');
  lines.push('- **Skipped**: not applicable to this project type (e.g., no auth → skip A07)');
  lines.push('- Edit this file to customize scope (note: re-running `npx atta-dev init` will overwrite)');
  lines.push('- OWASP reference: https://owasp.org/Top10/2025/');
  lines.push('');

  return lines.join('\n');
}

/**
 * Write the OWASP scope file to .atta/team/owasp-scope.md.
 * Idempotent — overwrites on re-run.
 *
 * @param {string} targetDir - Project root
 * @param {string[]} detectedTechs - Array of detected technology identifiers
 * @param {string} attaRoot - Path to .atta/ source
 * @returns {boolean} true if file was written
 */
export function writeOwaspScope(targetDir, detectedTechs, attaRoot) {
  const teamDir = join(targetDir, '.atta', 'team');
  mkdirSync(teamDir, { recursive: true });

  const content = formatOwaspScope(detectedTechs, attaRoot);
  const filePath = join(teamDir, 'owasp-scope.md');
  writeFileSync(filePath, content);
  return true;
}
