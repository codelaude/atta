import { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { readVersion, countFiles } from '../lib/fs-utils.js';
import { listSkills } from '../adapters/claude-code.js';
import { copyAgentFiles, rewriteSkillBody, generateHooksConfig, listAgentDefs } from '../adapters/shared.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Path to .claude/ source (tool-specific: skills, agents, hooks) */
const CLAUDE_ROOT = resolve(__dirname, '..', '..', '.claude');

/** Path to .atta/ source (shared: knowledge, scripts, metadata, bootstrap) */
const ATTA_ROOT = resolve(__dirname, '..', '..', '.atta');

const TARGETS = {
  'claude-code': {
    label: 'Claude Code',
    generate: generateClaudeCodePlugin,
  },
  copilot: {
    label: 'Copilot',
    generate: generateCopilotPlugin,
  },
  cursor: {
    label: 'Cursor',
    generate: generateCursorPlugin,
  },
  codex: {
    label: 'Codex',
    generate: generateCodexPlugin,
  },
  all: {
    label: 'All targets',
    generate: null, // handled specially in plugin()
  },
};

/**
 * `npx atta-dev plugin` command — generates standalone plugin packages
 * for distribution via tool-specific marketplaces.
 */
export async function plugin(options) {
  const target = options.target;
  const outputDir = resolve(options.output);

  // Validate target
  if (!TARGETS[target]) {
    console.error(
      pc.red(`Error: Unknown target "${target}". Available: ${Object.keys(TARGETS).join(', ')}`)
    );
    process.exit(1);
  }

  // Verify framework source exists
  if (!existsSync(CLAUDE_ROOT) || !existsSync(ATTA_ROOT)) {
    console.error(
      pc.red('Error: Framework source not found. Expected .claude/ and .atta/ directories.')
    );
    process.exit(1);
  }

  // Handle --target all: build all real targets sequentially
  const targets = target === 'all'
    ? Object.entries(TARGETS).filter(([k, v]) => k !== 'all' && v.generate)
    : [[target, TARGETS[target]]];

  for (const [, generator] of targets) {
    p.intro(pc.bold(`Generating ${generator.label} plugin`));

    const s = p.spinner();
    s.start('Building plugin package...');

    try {
      const result = generator.generate(CLAUDE_ROOT, ATTA_ROOT, outputDir);
      s.stop(`${result.files} files generated.`);

      p.log.success(`Plugin package: ${pc.cyan(result.outputDir)}`);
      console.log('');

      for (const item of result.summary) {
        console.log(`  ${pc.green('✓')} ${item}`);
      }

      console.log('');
      if (result.testCmd) {
        p.log.info(`Test locally: ${pc.cyan(result.testCmd)}`);
      }

      p.outro('Plugin package ready!');
    } catch (err) {
      s.stop(pc.red(`${generator.label} plugin generation failed.`));
      p.log.error(err.message);
      if (process.env.DEBUG) {
        console.error(err.stack);
      }
      process.exit(1);
    }
  }
}

/**
 * Generate Claude Code plugin package.
 *
 * Output structure:
 *   .claude-plugin/plugin.json
 *   skills/<name>/SKILL.md (+ supporting files)
 *   agents/<name>.md (core agents, coordinators, specialists)
 *   hooks/hooks.json
 *   scripts/session-track.sh
 *   settings.json
 *   README.md
 */
function generateClaudeCodePlugin(claudeRoot, attaRoot, outputBase) {
  const pluginDir = join(outputBase, 'claude-code');
  const version = readVersion(attaRoot);
  let files = 0;
  const summary = [];

  // Clean previous build
  if (existsSync(pluginDir)) {
    rmSync(pluginDir, { recursive: true });
  }
  mkdirSync(pluginDir, { recursive: true });

  // 1. Copy skills (entire skill directories with SKILL.md + supporting files)
  //    Skip: .DS_Store, generated/ (framework-dev only)
  const skillsDir = join(pluginDir, 'skills');
  const srcSkills = join(claudeRoot, 'skills');
  if (existsSync(srcSkills)) {
    cpSync(srcSkills, skillsDir, {
      recursive: true,
      filter: (src, _dest) => {
        const name = basename(src);
        if (name === '.DS_Store') return false;
        if (name === 'generated') return false;
        return true;
      },
    });
    const skillCount = countFiles(skillsDir);
    files += skillCount;
    summary.push(`skills/ (${listSkills(claudeRoot).length} skills, ${skillCount} files)`);
  }

  // 2. Copy agents
  const agentsDir = join(pluginDir, 'agents');
  const agentCount = copyAgentFiles(claudeRoot, agentsDir, { quiet: true });
  files += agentCount;
  summary.push(`agents/ (${agentCount} agent definitions)`);

  // 3. Generate hooks.json
  const hooksDir = join(pluginDir, 'hooks');
  mkdirSync(hooksDir, { recursive: true });

  const hooksJson = {
    PostToolUse: [
      {
        matcher: 'Skill',
        hooks: [
          {
            type: 'command',
            command: '"${CLAUDE_PLUGIN_ROOT}/scripts/session-track.sh"',
            async: true,
          },
        ],
      },
    ],
    Stop: [
      {
        hooks: [
          {
            type: 'command',
            command: '"${CLAUDE_PLUGIN_ROOT}/scripts/session-track.sh"',
            async: true,
          },
        ],
      },
    ],
  };

  const hooksPath = join(hooksDir, 'hooks.json');
  writeAndSync(hooksPath, JSON.stringify(hooksJson, null, 2) + '\n');
  files++;
  summary.push('hooks/hooks.json (session tracking: PostToolUse, Stop)');

  // 4. Copy hook scripts
  const scriptsDir = join(pluginDir, 'scripts');
  const srcHooks = join(claudeRoot, 'hooks');
  if (existsSync(srcHooks)) {
    mkdirSync(scriptsDir, { recursive: true });
    cpSync(srcHooks, scriptsDir, { recursive: true });
    const scriptCount = countFiles(scriptsDir);
    files += scriptCount;
    summary.push(`scripts/ (${scriptCount} hook scripts)`);
  }

  // 5. Generate settings.json (default permissions for plugin)
  const settings = {
    permissions: {
      allow: [
        'Bash(bash ${CLAUDE_PLUGIN_ROOT}/scripts/*:*)',
        'Bash(bash .atta/scripts/*:*)',
        'Edit(./.atta/.context/**)',
        'Edit(./.claude/agents/memory/**)',
        'Edit(./.atta/knowledge/**)',
        'Edit(./.atta/project/**)',
      ],
    },
  };

  const settingsPath = join(pluginDir, 'settings.json');
  writeAndSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  files++;
  summary.push('settings.json (default permissions)');

  // 6. Generate .claude-plugin/plugin.json manifest
  const manifestDir = join(pluginDir, '.claude-plugin');
  mkdirSync(manifestDir, { recursive: true });

  const manifest = {
    name: 'atta',
    version,
    description:
      'Atta — AI Dev Team Agent. Dynamic agent generation from tech detection, multi-agent collaboration, and intelligent code review.',
    author: {
      name: 'CodeLaude',
      url: 'https://github.com/codelaude',
    },
    repository: 'https://github.com/codelaude/atta',
    license: 'MIT',
    keywords: [
      'framework',
      'agents',
      'skills',
      'code-review',
      'testing',
      'security',
      'multi-agent',
    ],
    skills: 'skills/',
    agents: 'agents/',
    hooks: 'hooks/hooks.json',
  };

  const manifestPath = join(manifestDir, 'plugin.json');
  writeAndSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  files++;
  summary.push('.claude-plugin/plugin.json (plugin manifest)');

  // 7. Generate README.md
  const skills = listSkills(claudeRoot);
  const readme = generatePluginReadme(version, skills);
  writeAndSync(join(pluginDir, 'README.md'), readme);
  files++;
  summary.push('README.md');

  return {
    files,
    outputDir: pluginDir,
    summary,
    testCmd: `claude --plugin-dir "${pluginDir}"`,
  };
}

// ─── Copilot Plugin ──────────────────────────────────────────────────────────

/** Skills that conflict with Copilot CLI built-in commands */
const COPILOT_BUILTIN_CONFLICTS = new Set(['review', 'agent', 'update']);

/**
 * Generate Copilot plugin package.
 *
 * Output structure:
 *   plugin.json
 *   skills/<name>/SKILL.md (renamed for conflicts)
 *   agents/<name>.agent.md (copied from .claude/agents/, .agent.md extension)
 *   hooks/hooks.json
 *   instructions/ (Copilot-idiomatic instruction files)
 *   README.md
 */
function generateCopilotPlugin(claudeRoot, attaRoot, outputBase) {
  const pluginDir = join(outputBase, 'copilot');
  const version = readVersion(attaRoot);
  const skills = listSkills(claudeRoot);
  let files = 0;
  const summary = [];

  // Clean previous build
  if (existsSync(pluginDir)) {
    rmSync(pluginDir, { recursive: true });
  }
  mkdirSync(pluginDir, { recursive: true });

  // Build command map for body rewriting
  const commandMap = {};
  for (const name of COPILOT_BUILTIN_CONFLICTS) {
    commandMap[name] = `/atta-${name}`;
  }

  const rewriteConfig = {
    agentsPath: 'agents',
    memoryPath: 'agents/memory',
    commandMap,
  };

  // 1. Copy and rewrite skills
  const skillsDir = join(pluginDir, 'skills');
  const srcSkills = join(claudeRoot, 'skills');

  for (const skill of skills) {
    const src = join(srcSkills, skill.dirName, 'SKILL.md');
    if (!existsSync(src)) continue;

    const destName = COPILOT_BUILTIN_CONFLICTS.has(skill.dirName)
      ? `atta-${skill.dirName}`
      : skill.dirName;
    const destDir = join(skillsDir, destName);
    mkdirSync(destDir, { recursive: true });

    let content = readFileSync(src, 'utf-8');

    // Rename frontmatter for conflicting skills
    if (COPILOT_BUILTIN_CONFLICTS.has(skill.dirName)) {
      content = content.replace(/^(---\nname:\s*)(.+)/m, `$1${destName}`);
    }

    // Rewrite body
    const fmMatch = content.match(/^---\n[\s\S]*?\n---\n/);
    if (fmMatch) {
      const frontmatter = fmMatch[0];
      const body = content.slice(frontmatter.length);
      content = frontmatter + rewriteSkillBody(body, rewriteConfig);
    }

    writeAndSync(join(destDir, 'SKILL.md'), content);
    files++;
  }

  const renamedCount = skills.filter((s) => COPILOT_BUILTIN_CONFLICTS.has(s.dirName)).length;
  summary.push(`skills/ (${skills.length} skills, ${renamedCount} renamed to avoid conflicts)`);

  // 2. Copy agents with Copilot-specific transforms:
  //    - .agent.md extension (Copilot ignores plain .md in agent directories)
  //    - Strip model: inherit (not a Copilot field)
  //    - Rewrite body paths and commands for Copilot
  const agentsDir = join(pluginDir, 'agents');
  const copilotAgentRewriteConfig = {
    agentsPath: 'agents',
    memoryPath: 'agents/memory',
    commandMap,
  };
  const agentCount = copyAgentFiles(claudeRoot, agentsDir, {
    quiet: true,
    extension: '.agent.md',
    transformFrontmatter: (fm) => ({
      name: fm.name,
      description: fm.description,
    }),
    transformBody: (body) => rewriteSkillBody(body, copilotAgentRewriteConfig),
  });
  files += agentCount;
  summary.push(`agents/ (${agentCount} .agent.md definitions)`);

  // 3. Generate hooks.json (Copilot hook format — 6 events)
  const hooksDir = join(pluginDir, 'hooks');
  mkdirSync(hooksDir, { recursive: true });

  const hooksJson = generateHooksConfig('copilot');

  writeAndSync(join(hooksDir, 'hooks.json'), JSON.stringify(hooksJson, null, 2) + '\n');
  files++;
  summary.push('hooks/hooks.json (Copilot hook format — 6 event placeholders)');

  // 4. Generate instructions files
  const instructionsDir = join(pluginDir, 'instructions');
  mkdirSync(instructionsDir, { recursive: true });

  const renamedWarnings = [...COPILOT_BUILTIN_CONFLICTS]
    .map((name) => `- **NEVER use \`/${name}\`** — it triggers Copilot's built-in. Use \`/atta-${name}\` instead.`)
    .join('\n');

  writeAndSync(join(instructionsDir, 'atta-skills.instructions.md'), [
    '# Atta Skills',
    '',
    'This project uses the Atta framework. Skills are in `skills/`.',
    '',
    '## Command Conflicts',
    '',
    renamedWarnings,
    '',
    '## Invocation',
    '',
    'Use `/skill-name` to activate a skill (e.g., `/preflight`, `/lint`, `/atta-review`).',
    '',
  ].join('\n'));
  files++;

  writeAndSync(join(instructionsDir, 'atta-agents.instructions.md'), [
    '# Atta Agents',
    '',
    'Agent definitions are in `agents/` as `.agent.md` files.',
    'Invoke agents via `/atta-agent <id>` (e.g., `/atta-agent project-owner`).',
    '',
  ].join('\n'));
  files++;

  summary.push('instructions/ (skill conflicts + agent registry)');

  // 5. Generate plugin.json manifest
  const manifest = {
    name: 'atta',
    description: 'Atta — AI Dev Team Agent. Dynamic agent generation from tech detection, multi-agent collaboration, and intelligent code review.',
    version,
    author: { name: 'CodeLaude' },
    license: 'MIT',
    keywords: ['framework', 'agents', 'skills', 'code-review'],
    agents: 'agents/',
    skills: 'skills/',
    hooks: 'hooks/hooks.json',
  };

  writeAndSync(join(pluginDir, 'plugin.json'), JSON.stringify(manifest, null, 2) + '\n');
  files++;
  summary.push('plugin.json (Copilot plugin manifest)');

  // 6. Generate README.md
  writeAndSync(join(pluginDir, 'README.md'), generateToolReadme('Copilot', version, skills, {
    installCmd: '/plugin install codelaude/atta-copilot-plugin',
    prefix: '/',
    renames: Object.fromEntries([...COPILOT_BUILTIN_CONFLICTS].map((n) => [n, `atta-${n}`])),
  }));
  files++;
  summary.push('README.md');

  return {
    files,
    outputDir: pluginDir,
    summary,
    testCmd: `/plugin install ${pluginDir}`,
  };
}

// ─── Cursor Plugin ───────────────────────────────────────────────────────────

/** Rewrite config for Cursor — @atta- mentions, agents/ relative paths */
const CURSOR_COMMAND_MAP = {
  review: '@atta-review',
  agent: '@atta-agent',
  atta: '@atta-atta',
  preflight: '@atta-preflight',
  lint: '@atta-lint',
  test: '@atta-test',
  collaborate: '@atta-collaborate',
  'team-lead': '@atta-team-lead',
  librarian: '@atta-librarian',
  patterns: '@atta-patterns',
  profile: '@atta-profile',
  'security-audit': '@atta-security-audit',
  ship: '@atta-ship',
  tutorial: '@atta-tutorial',
  optimize: '@atta-optimize',
  update: '@atta-update',
  migrate: '@atta-migrate',
};

/**
 * Generate Cursor plugin package.
 *
 * Output structure:
 *   .cursor-plugin/plugin.json
 *   rules/*.mdc (skills converted to MDC format)
 *   agents/<name>.md
 *   skills/<name>/SKILL.md (Cursor also reads SKILL.md natively)
 *   hooks/hooks.json
 *   README.md
 */
function generateCursorPlugin(claudeRoot, attaRoot, outputBase) {
  const pluginDir = join(outputBase, 'cursor');
  const version = readVersion(attaRoot);
  const skills = listSkills(claudeRoot);
  let files = 0;
  const summary = [];

  // Clean previous build
  if (existsSync(pluginDir)) {
    rmSync(pluginDir, { recursive: true });
  }
  mkdirSync(pluginDir, { recursive: true });

  const rewriteConfig = {
    agentsPath: 'agents',
    memoryPath: 'agents/memory',
    commandMap: CURSOR_COMMAND_MAP,
  };

  // 1. Generate .cursor rules (MDC format) — primary skill delivery for Cursor
  const rulesDir = join(pluginDir, 'rules');
  mkdirSync(rulesDir, { recursive: true });

  for (const skill of skills) {
    const skillFile = join(claudeRoot, 'skills', skill.dirName, 'SKILL.md');
    if (!existsSync(skillFile)) continue;

    const content = readFileSync(skillFile, 'utf-8');
    const rawBody = content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
    const body = rewriteSkillBody(rawBody, rewriteConfig);
    const desc = skill.description || `Run the ${skill.name} skill`;

    // Build MDC with safe YAML description
    const safeDesc = /[:#\[\]{}>|*&!%@`]/.test(desc)
      ? `"${desc.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
      : desc;

    const mdc = [
      '---',
      `description: ${safeDesc}`,
      'globs: []',
      'alwaysApply: false',
      '---',
      '',
      body,
      '',
    ].join('\n');

    writeAndSync(join(rulesDir, `atta-${skill.dirName}.mdc`), mdc);
    files++;
  }

  // Main atta.mdc — always-applied framework context
  const skillList = skills
    .map((s) => `- \`@atta-${s.dirName}\` — ${s.description || s.name}`)
    .join('\n');

  writeAndSync(join(rulesDir, 'atta.mdc'), [
    '---',
    'description: Atta AI development team framework — agent routing and core conventions',
    'globs: []',
    'alwaysApply: true',
    '---',
    '',
    '# Atta Agent Framework',
    '',
    'This project uses the Atta framework. See `agents/` for agent definitions.',
    '',
    '## Available Skills',
    '',
    '@-mention any skill in chat to activate it:',
    '',
    skillList,
    '',
    '## Agent Team',
    '',
    'Agents use a three-tier hierarchy:',
    '1. **Core Agents** — Always available (project-owner, code-reviewer, librarian)',
    '2. **Coordinators** — Generated per project (fe-team-lead, be-team-lead)',
    '3. **Specialists** — Generated from detected tech stack (run `@atta-atta` to set up)',
    '',
  ].join('\n'));
  files++;

  summary.push(`rules/ (${skills.length} skill rules + atta.mdc)`);

  // 2. Copy and rewrite skills as SKILL.md (Cursor discovers from skills/ natively)
  const skillsDir = join(pluginDir, 'skills');
  const srcSkills = join(claudeRoot, 'skills');

  for (const skill of skills) {
    const src = join(srcSkills, skill.dirName, 'SKILL.md');
    if (!existsSync(src)) continue;

    const destDir = join(skillsDir, skill.dirName);
    mkdirSync(destDir, { recursive: true });

    const content = readFileSync(src, 'utf-8');
    const fmMatch = content.match(/^---\n[\s\S]*?\n---\n/);
    if (fmMatch) {
      const frontmatter = fmMatch[0];
      const body = content.slice(frontmatter.length);
      writeAndSync(join(destDir, 'SKILL.md'), frontmatter + rewriteSkillBody(body, rewriteConfig));
    } else {
      writeAndSync(join(destDir, 'SKILL.md'), rewriteSkillBody(content, rewriteConfig));
    }

    files++;
  }

  summary.push(`skills/ (${skills.length} SKILL.md files — rewritten for Cursor)`);

  // 3. Copy agents with Cursor-specific transforms:
  //    - Strip model: inherit (not a Cursor field)
  //    - Rewrite body paths and commands for Cursor
  const agentsDir = join(pluginDir, 'agents');
  const agentCount = copyAgentFiles(claudeRoot, agentsDir, {
    quiet: true,
    transformFrontmatter: (fm) => ({
      name: fm.name,
      description: fm.description,
    }),
    transformBody: (body) => rewriteSkillBody(body, rewriteConfig),
  });
  files += agentCount;
  summary.push(`agents/ (${agentCount} agent definitions)`);

  // 4. Generate hooks.json (Cursor format — 19+ events available)
  const hooksDir = join(pluginDir, 'hooks');
  mkdirSync(hooksDir, { recursive: true });

  const hooksJson = generateHooksConfig('cursor');

  writeAndSync(join(hooksDir, 'hooks.json'), JSON.stringify(hooksJson, null, 2) + '\n');
  files++;
  summary.push('hooks/hooks.json (Cursor hook format — 10 event placeholders)');

  // 5. Generate .cursor-plugin/plugin.json
  const manifestDir = join(pluginDir, '.cursor-plugin');
  mkdirSync(manifestDir, { recursive: true });

  const manifest = {
    name: 'atta',
    description: 'Atta — AI Dev Team Agent. Dynamic agent generation from tech detection, multi-agent collaboration, and intelligent code review.',
    version,
    author: { name: 'CodeLaude' },
    license: 'MIT',
    keywords: ['framework', 'agents', 'skills', 'code-review'],
    rules: 'rules/',
    agents: 'agents/',
    skills: 'skills/',
    hooks: 'hooks/hooks.json',
  };

  writeAndSync(join(manifestDir, 'plugin.json'), JSON.stringify(manifest, null, 2) + '\n');
  files++;
  summary.push('.cursor-plugin/plugin.json (Cursor marketplace manifest)');

  // 6. README.md
  writeAndSync(join(pluginDir, 'README.md'), generateToolReadme('Cursor', version, skills, {
    installCmd: 'Browse cursor.com/marketplace or /add-plugin',
    prefix: '@atta-',
    renames: {},
  }));
  files++;
  summary.push('README.md');

  return {
    files,
    outputDir: pluginDir,
    summary,
    testCmd: 'Open Cursor → /add-plugin → select local directory',
  };
}

// ─── Codex Plugin ────────────────────────────────────────────────────────────

/** Command map for Codex — $skill prefix */
const CODEX_COMMAND_MAP = {
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

/**
 * Generate Codex skills package.
 *
 * Codex has no standalone plugin manifest — distribution is skills + AGENTS.md + config.toml.
 *
 * Output structure:
 *   skills/<name>/SKILL.md (rewritten with $prefix)
 *   agents/<name>.md (frontmatter filtered to name+description, body rewritten)
 *   .codex/config.toml ([agents.*] sections)
 *   AGENTS.md
 *   README.md
 */
function generateCodexPlugin(claudeRoot, attaRoot, outputBase) {
  const pluginDir = join(outputBase, 'codex');
  const version = readVersion(attaRoot);
  const skills = listSkills(claudeRoot);
  let files = 0;
  const summary = [];

  // Clean previous build
  if (existsSync(pluginDir)) {
    rmSync(pluginDir, { recursive: true });
  }
  mkdirSync(pluginDir, { recursive: true });

  const rewriteConfig = {
    agentsPath: '.agents/agents',
    memoryPath: '.agents/agents/memory',
    commandMap: CODEX_COMMAND_MAP,
  };

  // 1. Copy and rewrite skills with $prefix
  const skillsDir = join(pluginDir, 'skills');
  const srcSkills = join(claudeRoot, 'skills');

  for (const skill of skills) {
    const src = join(srcSkills, skill.dirName, 'SKILL.md');
    if (!existsSync(src)) continue;

    const destDir = join(skillsDir, skill.dirName);
    mkdirSync(destDir, { recursive: true });

    const content = readFileSync(src, 'utf-8');
    const fmMatch = content.match(/^---\n[\s\S]*?\n---\n/);
    if (fmMatch) {
      const frontmatter = fmMatch[0];
      const body = content.slice(frontmatter.length);
      writeAndSync(join(destDir, 'SKILL.md'), frontmatter + rewriteSkillBody(body, rewriteConfig));
    } else {
      writeAndSync(join(destDir, 'SKILL.md'), rewriteSkillBody(content, rewriteConfig));
    }

    files++;
  }

  summary.push(`skills/ (${skills.length} skills with $prefix)`);

  // 2. Copy agents with Codex-specific transforms:
  //    - Strip model: inherit (not a Codex field)
  //    - Rewrite body paths and commands for Codex
  const agentsDir = join(pluginDir, 'agents');
  const codexAgentRewriteConfig = {
    agentsPath: '.agents/agents',
    memoryPath: '.agents/agents/memory',
    commandMap: CODEX_COMMAND_MAP,
  };
  const agentCount = copyAgentFiles(claudeRoot, agentsDir, {
    quiet: true,
    transformFrontmatter: (fm) => ({
      name: fm.name,
      description: fm.description,
    }),
    transformBody: (body) => rewriteSkillBody(body, codexAgentRewriteConfig),
  });
  files += agentCount;
  summary.push(`agents/ (${agentCount} agent definitions)`);

  // 3. Generate .codex/config.toml with [agents.*] sections
  const agentDefs = listAgentDefs(claudeRoot);
  if (agentDefs.length > 0) {
    const codexConfigDir = join(pluginDir, '.codex');
    mkdirSync(codexConfigDir, { recursive: true });

    const tomlLines = [
      '# Atta Agent Definitions',
      '# Generated by Atta framework — do not edit manually.',
      '# See agents/ for full agent instructions.',
      '',
    ];

    for (const agent of agentDefs) {
      const desc = (agent.description || `Atta ${agent.name} agent`)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,
          (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
      // Quote the key to handle names with dots, spaces, or other non-bare-key chars
      const safeKey = /^[A-Za-z0-9_-]+$/.test(agent.name) ? agent.name : `"${agent.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      tomlLines.push(`[agents.${safeKey}]`);
      tomlLines.push(`description = "${desc}"`);
      tomlLines.push(`config_file = ".agents/agents/${agent.fileName}"`);
      tomlLines.push('');
    }

    writeAndSync(join(codexConfigDir, 'config.toml'), tomlLines.join('\n'));
    files++;
    summary.push(`.codex/config.toml (${agentDefs.length} agent sections)`);
  }

  // 4. Generate AGENTS.md (Codex primary instruction file)
  const skillTable = skills
    .map((s) => `| \`$${s.name}\` | ${s.description} |`)
    .join('\n');

  const agentsMd = [
    '# AGENTS.md — Atta Agent Context',
    '',
    '> Generated by [Atta](https://github.com/codelaude/atta) — AI Dev Team Agent',
    '',
    '## Skills',
    '',
    '| Command | Description |',
    '|---------|-------------|',
    skillTable,
    '',
    '## Agents',
    '',
    'Agent definitions are in `.agents/agents/`. Invoke via `$agent <id>`.',
    '',
    '- **project-owner** — Routes tasks to specialists',
    '- **code-reviewer** — Code quality reviews',
    '- **librarian** — Knowledge and directive management',
    '',
  ].join('\n');

  writeAndSync(join(pluginDir, 'AGENTS.md'), agentsMd);
  files++;
  summary.push('AGENTS.md (Codex instruction file)');

  // 5. README.md
  writeAndSync(join(pluginDir, 'README.md'), generateToolReadme('Codex', version, skills, {
    installCmd: 'Copy skills/ to .agents/skills/, agents/ to .agents/agents/, and .codex/config.toml to .codex/config.toml in your project',
    prefix: '$',
    renames: {},
  }));
  files++;
  summary.push('README.md');

  return {
    files,
    outputDir: pluginDir,
    summary,
    testCmd: 'cp -r skills/ /path/to/project/.agents/skills/ && cp -r agents/ /path/to/project/.agents/agents/ && cp -r .codex/ /path/to/project/.codex/',
  };
}

// ─── Shared Helpers ──────────────────────────────────────────────────────────

/** Generate a tool-specific README.md */
function generateToolReadme(toolName, version, skills, { installCmd, prefix, renames }) {
  const skillRows = skills.map((s) => {
    const name = renames[s.name] || s.name;
    return `| \`${prefix}${name}\` | ${s.description} |`;
  }).join('\n');

  return [
    `# Atta — AI Dev Team Agent (${toolName} Plugin)`,
    '',
    `> v${version} — Dynamic agent generation, multi-agent collaboration, and intelligent code review.`,
    '',
    '## Installation',
    '',
    '```',
    installCmd,
    '```',
    '',
    '## Skills',
    '',
    '| Command | Description |',
    '|---------|-------------|',
    skillRows,
    '',
    '## Links',
    '',
    '- [Documentation](https://github.com/codelaude/atta)',
    '- [npm package](https://www.npmjs.com/package/atta-dev) — for `npx atta-dev init` workflow',
    '',
    '---',
    '',
    `Generated by Atta v${version}`,
    '',
  ].join('\n');
}

/** Generate README.md for the plugin package */
function generatePluginReadme(version, skills) {
  const skillTable = skills
    .map((s) => `| \`/atta:${s.name}\` | ${s.description} |`)
    .join('\n');

  return [
    '# Atta — AI Dev Team Agent (Claude Code Plugin)',
    '',
    `> v${version} — Dynamic agent generation, multi-agent collaboration, and intelligent code review.`,
    '',
    '## Installation',
    '',
    '```bash',
    'claude plugin install atta',
    '```',
    '',
    'Or test locally:',
    '',
    '```bash',
    'claude --plugin-dir ./path-to-this-directory',
    '```',
    '',
    '## Skills',
    '',
    '| Command | Description |',
    '|---------|-------------|',
    skillTable,
    '',
    '## Getting Started',
    '',
    '1. Install the plugin',
    '2. Run `npx atta-dev init` to set up the framework in your project',
    '3. Run `/atta:atta` to detect your tech stack and generate project-specific agents',
    '4. Run `/atta:tutorial` for a 5-minute interactive walkthrough',
    '5. Run `/atta:review` to review your code',
    '',
    '## Agents',
    '',
    'Core agents are included in the plugin:',
    '',
    '- **project-owner** — Routes tasks to specialists, synthesizes multi-agent responses',
    '- **code-reviewer** — Code quality reviews against conventions and patterns',
    '- **librarian** — Knowledge base maintenance, directive capture, learning management',
    '- **business-analyst** — Requirements and acceptance criteria',
    '- **qa-validator** — ACC validation and test scenarios',
    '- **rubber-duck** — Guided learning mode',
    '- **pr-manager** — PR description generation',
    '',
    'Run `/atta:atta` to generate stack-specific specialists (frontend lead, backend lead, framework specialists, etc.).',
    '',
    '## Links',
    '',
    '- [Documentation](https://github.com/codelaude/atta)',
    '- [npm package](https://www.npmjs.com/package/atta-dev) — for `npx atta-dev init` workflow',
    '',
    '---',
    '',
    `Generated by Atta v${version}`,
    '',
  ].join('\n');
}

/** Write file atomically (write to .tmp, then rename) */
function writeAndSync(filePath, content) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp';
  writeFileSync(tmp, content);
  renameSync(tmp, filePath);
}
