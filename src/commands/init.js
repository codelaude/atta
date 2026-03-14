import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { install as installClaude } from '../adapters/claude-code.js';
import { install as installCopilot } from '../adapters/copilot.js';
import { install as installCodex } from '../adapters/codex.js';
import { install as installGemini } from '../adapters/gemini.js';
import { install as installCursor } from '../adapters/cursor.js';
import { install as installGithubAction } from '../adapters/github-action.js';
import { runSetupPrompts, generateProfile } from '../prompts/setup.js';
import { generateGettingStarted } from '../guides/getting-started.js';
import { printBanner } from '../banner.js';
import { countFiles } from '../lib/fs-utils.js';
import { parseInitOutput } from '../lib/init-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Path to .claude/ source (tool-specific: skills, agents, hooks) */
const CLAUDE_ROOT = resolve(__dirname, '..', '..', '.claude');

/** Path to .atta/ source (shared: knowledge, scripts, docs, metadata, context, bootstrap) */
const ATTA_ROOT = resolve(__dirname, '..', '..', '.atta');

const ADAPTERS = {
  'claude-code': {
    install: installClaude,
    label: 'Claude Code',
    nextSteps: [
      `Run ${pc.cyan('/atta')} in Claude Code to generate agents for your stack`,
      `Run ${pc.cyan('/atta-tutorial')} for a 5-minute interactive walkthrough`,
      `Run ${pc.cyan('/atta-review')} to review your code`,
    ],
  },
  copilot: {
    install: installCopilot,
    label: 'Copilot CLI',
    nextSteps: [
      `Open your project in Copilot CLI`,
      `Try ${pc.cyan('/atta-review')} to review changed files`,
      `See ${pc.cyan('AGENTS.md')} for full agent registry`,
    ],
  },
  codex: {
    install: installCodex,
    label: 'Codex CLI',
    nextSteps: [
      `Open your project in Codex CLI`,
      `See ${pc.cyan('AGENTS.md')} for available agents and commands`,
      `Try mentioning ${pc.cyan('$atta-review')} or ${pc.cyan('$atta-preflight')} to activate skills`,
    ],
  },
  gemini: {
    install: installGemini,
    label: 'Gemini CLI',
    nextSteps: [
      `Open your project in Gemini CLI`,
      `Use ${pc.cyan('/atta-review')} or ${pc.cyan('/atta-preflight')} as slash commands`,
      `See ${pc.cyan('GEMINI.md')} for agent context`,
    ],
  },
  cursor: {
    install: installCursor,
    label: 'Cursor',
    nextSteps: [
      `Open your project in Cursor`,
      `@-mention skills in chat: ${pc.cyan('@atta-review')}, ${pc.cyan('@atta-preflight')}`,
      `See ${pc.cyan('AGENTS.md')} for the full agent registry`,
    ],
  },
  'github-action': {
    install: installGithubAction,
    label: 'GitHub Action',
    // nextSteps built dynamically in printWelcome based on provider/authBackend
    nextSteps: [],
  },
};

const VALID_PROVIDERS = ['anthropic', 'openai', 'azure', 'ollama'];
const VALID_AUTH_BACKENDS = ['anthropic', 'bedrock', 'vertex', 'foundry'];

export async function init(options) {
  const targetDir = resolve(options.directory);
  const dryRun = options.dryRun;
  const authBackend = options.authBackend || 'anthropic';
  const provider = options.provider || 'anthropic';

  // Validate provider and auth-backend values
  if (!VALID_PROVIDERS.includes(provider)) {
    console.error(pc.red(`Error: Invalid provider "${provider}". Valid: ${VALID_PROVIDERS.join(', ')}`));
    process.exit(1);
  }
  // auth-backend only applies to Anthropic provider (Bedrock/Vertex/Foundry are Anthropic auth variants)
  if (provider === 'anthropic' && !VALID_AUTH_BACKENDS.includes(authBackend)) {
    console.error(pc.red(`Error: Invalid auth-backend "${authBackend}". Valid: ${VALID_AUTH_BACKENDS.join(', ')}`));
    process.exit(1);
  }

  // Verify framework source exists
  if (!existsSync(CLAUDE_ROOT) || !existsSync(ATTA_ROOT)) {
    console.error(
      pc.red('Error: Framework source not found. Expected .claude/ and .atta/ directories.')
    );
    process.exit(1);
  }

  // Check target directory
  if (!existsSync(targetDir)) {
    console.error(
      pc.red(`Error: Target directory does not exist: ${targetDir}`)
    );
    process.exit(1);
  }

  // Non-interactive mode (--yes flag)
  if (options.yes) {
    printBanner();
    return runInstall(targetDir, options.adapter || 'claude-code', dryRun, null, { authBackend, provider });
  }

  // Interactive setup — only pass adapter if explicitly provided via --adapter flag
  const answers = await runSetupPrompts({ adapter: options.adapter || null });

  // Run installation with chosen adapter
  await runInstall(targetDir, answers.adapter, dryRun, answers, { authBackend, provider });
}

async function runInstall(targetDir, adapterName, dryRun, answers, adapterOptions = {}) {
  // Validate adapter
  const adapter = ADAPTERS[adapterName];
  if (!adapter) {
    p.cancel(
      `Unknown adapter "${adapterName}". Available: ${Object.keys(ADAPTERS).join(', ')}`
    );
    process.exit(1);
  }

  // Detect existing installation
  const claudeDir = join(targetDir, '.claude');
  const attaDir = join(targetDir, '.atta');
  const isUpdate = existsSync(claudeDir) || existsSync(attaDir);

  // Detect pre-v2.7 layout (shared content in .claude/ instead of .atta/)
  // Also require .atta/knowledge/ to be absent — if it exists, this is a v2.7 install
  // and migrateToAtta()'s cpSync would overwrite user-modified .atta/knowledge/ content.
  const needsMigration = existsSync(join(claudeDir, 'knowledge')) && !existsSync(join(attaDir, 'team')) && !existsSync(join(attaDir, 'knowledge'));
  // Detect pre-v3.0 layout (.atta/knowledge/ instead of .atta/team/ + .atta/local/)
  const needsV3Migration = existsSync(join(attaDir, 'knowledge')) && !existsSync(join(attaDir, 'team'));

  if (isUpdate) {
    if (needsMigration) {
      p.log.warn(
        'Pre-v2.7 installation detected — migrating shared content to .atta/.\n' +
          pc.dim('User-generated content will be preserved and moved to .atta/.')
      );
    } else {
      p.log.warn(
        'Existing installation detected — updating framework files.\n' +
          pc.dim('User-generated content (agents, knowledge) will be preserved.')
      );
    }
  }

  p.log.info(`Target: ${pc.cyan(targetDir)}`);
  p.log.info(`Adapter: ${pc.cyan(adapter.label)}`);

  if (dryRun) {
    p.log.warn('DRY RUN — no files will be written.');
    console.log('');
    listFrameworkFiles();
    return;
  }

  const s = p.spinner();
  s.start('Installing framework files...');

  let results;
  let initSeeds = null;
  try {
    // Migrate pre-v2.7 layout if needed (move shared content from .claude/ to .atta/)
    if (needsMigration) {
      migrateToAtta(targetDir);
    }

    // Migrate pre-v3.0 layout if needed (.atta/knowledge/ → .atta/team/ + .atta/local/)
    // Re-evaluate: migrateToAtta() may have just created .atta/knowledge/
    const runV3Migration = needsV3Migration ||
      (needsMigration && existsSync(join(attaDir, 'knowledge')) && !existsSync(join(attaDir, 'team')));
    if (runV3Migration) {
      migrateToV3(targetDir);
    }

    // Parse existing init output (Phase 0.5: absorb native init conventions)
    initSeeds = parseInitOutput(targetDir, adapterName);

    // Run the adapter
    results = adapter.install(CLAUDE_ROOT, ATTA_ROOT, targetDir, { quiet: true, ...adapterOptions, initSeeds });

    // Gitignore runtime & personal content; keep only team-shared files
    ensureAttaGitignored(targetDir, adapterName);

    // Pre-fill developer profile if we have answers
    if (answers) {
      const profileContent = generateProfile(answers);
      const profileDir = join(attaDir, 'local');
      mkdirSync(profileDir, { recursive: true });
      const profilePath = join(profileDir, 'developer-profile.md');
      writeFileSync(profilePath + '.tmp', profileContent);
      renameSync(profilePath + '.tmp', profilePath);
      results.files++;
    }

    // Generate GETTING-STARTED.md
    const gettingStarted = generateGettingStarted(adapterName, answers);
    const gsPath = join(targetDir, 'GETTING-STARTED.md');
    writeFileSync(gsPath + '.tmp', gettingStarted);
    renameSync(gsPath + '.tmp', gsPath);
    results.files++;

    // Remove tutorial skill if user opted out
    if (answers && !answers.includeTutorial) {
      const tutorialPaths = [
        join(claudeDir, 'skills', 'atta-tutorial'),               // Claude Code
        join(targetDir, '.github', 'skills', 'atta-tutorial'),     // Copilot
        join(targetDir, '.agents', 'skills', 'atta-tutorial'),     // Codex
        join(targetDir, '.gemini', 'commands', 'tutorial.toml'), // Gemini
        join(targetDir, '.cursor', 'rules', 'atta-tutorial.mdc'), // Cursor
      ];
      for (const tutorialPath of tutorialPaths) {
        if (existsSync(tutorialPath)) {
          rmSync(tutorialPath, { recursive: true });
          results.files--;
        }
      }
    }
  } catch (err) {
    s.stop(pc.red('Installation failed.'));
    p.log.error(err.message);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
    process.exit(1);
  }

  s.stop(`${results.files} files installed.`);

  // Print welcome summary
  console.log('');
  printWelcome(adapterName, adapter, answers, adapterOptions, initSeeds);
}

function printWelcome(adapterName, adapter, answers, adapterOptions = {}, initSeeds = null) {
  console.log(pc.bold(pc.green('Setup complete!')));
  console.log('');

  // Show init absorption summary if seeds were found
  if (initSeeds) {
    const parts = [];
    if (initSeeds.buildCmd.length > 0) parts.push(`${initSeeds.buildCmd.length} build command(s)`);
    if (initSeeds.testCmd.length > 0) parts.push(`${initSeeds.testCmd.length} test command(s)`);
    if (initSeeds.conventions.length > 0) parts.push(`${initSeeds.conventions.length} convention(s)`);
    console.log(pc.dim(`Found existing ${initSeeds.source} — detected ${parts.join(', ')}`));
    console.log(pc.dim('These conventions were detected from your existing setup.'));
    console.log('');
  }

  // Quick reference
  console.log(pc.bold('Quick Reference'));
  console.log(pc.dim('─'.repeat(40)));

  if (adapterName === 'github-action') {
    // GitHub Action: automated CI, no interactive commands
    console.log(`  ${pc.cyan('.github/workflows/atta-review.yml')}   Auto-runs on every PR`);
    console.log(`  ${pc.cyan('.atta/team/ci-suppressions.md')}       False positive management`);
  } else if (adapterName === 'cursor') {
    // Cursor uses @-mention invocation, not slash commands
    console.log(`  ${pc.cyan('atta.mdc')}             Framework context (auto-applied)`);
    console.log(`  ${pc.cyan('@atta')}               Set up agents for your stack`);
    console.log(`  ${pc.cyan('@atta-review')}         Code review against conventions`);
    console.log(`  ${pc.cyan('@atta-preflight')}      Full pre-PR validation`);
    console.log(`  ${pc.cyan('@atta-agent')} <id>     Invoke any agent directly`);
    if (answers?.includeTutorial !== false) {
      console.log(`  ${pc.cyan('@atta-tutorial')}       5-minute interactive walkthrough`);
    }
  } else {
    const prefix = adapterName === 'codex' ? '$' : '/';

    console.log(`  ${pc.cyan(`${prefix}atta`)}              Set up agents for your stack`);
    console.log(`  ${pc.cyan(`${prefix}atta-review`)}       Code review against conventions`);
    console.log(`  ${pc.cyan(`${prefix}atta-preflight`)}    Full pre-PR validation`);
    console.log(`  ${pc.cyan(`${prefix}atta-agent <id>`)}   Invoke any agent directly`);

    if (answers?.includeTutorial !== false) {
      console.log(`  ${pc.cyan(`${prefix}atta-tutorial`)}    5-minute interactive walkthrough`);
    }
  }

  console.log(pc.dim('─'.repeat(40)));

  if (answers) {
    console.log('');
    console.log(
      pc.dim('Your preferences were saved to .atta/local/developer-profile.md (personal, gitignored)')
    );
    console.log(pc.dim('Team conventions: .atta/project/project-profile.md (committed)'));
    console.log(pc.dim('Personal & runtime content (.atta/local/) is gitignored automatically.'));
    console.log(pc.dim('Edit both anytime to refine how agents and CI work with you.'));
  }

  const nextSteps = adapterName === 'github-action'
    ? buildGithubActionNextSteps(adapterOptions)
    : adapter.nextSteps;

  console.log('');
  console.log(pc.bold('Next steps:'));
  for (let i = 0; i < nextSteps.length; i++) {
    console.log(`  ${i + 1}. ${nextSteps[i]}`);
  }

  console.log('');
  console.log(
    pc.dim('See GETTING-STARTED.md for the full guide.')
  );

  p.outro('Happy coding!');
}

function buildGithubActionNextSteps({ provider = 'anthropic', authBackend = 'anthropic' } = {}) {
  const isLLMAction = ['openai', 'azure', 'ollama'].includes(provider);

  const secretStep = {
    anthropic: `Add ${pc.cyan('ANTHROPIC_API_KEY')} to your repository secrets`,
    bedrock: `Add ${pc.cyan('AWS_ACCESS_KEY_ID')} + ${pc.cyan('AWS_SECRET_ACCESS_KEY')} to repository secrets`,
    vertex: `Add ${pc.cyan('GCP_PROJECT_ID')} to repository secrets and configure Workload Identity`,
    foundry: `Add ${pc.cyan('AZURE_ENDPOINT')} to repository secrets and configure Azure AI Foundry`,
    openai: `Add ${pc.cyan('OPENAI_API_KEY')} to your repository secrets`,
    azure: `Add ${pc.cyan('AZURE_OPENAI_API_KEY')} to repository secrets and update the ${pc.cyan('base_url')} in the workflow`,
    ollama: `Ensure Ollama is accessible from your GitHub Actions runner (self-hosted runner recommended)`,
  }[isLLMAction ? provider : authBackend];

  return [
    secretStep,
    `Commit ${pc.cyan('.github/workflows/atta-review.yml')} — CI review runs automatically on PRs`,
    `Run ${pc.cyan('/atta')} first to detect conventions (improves review quality)`,
    `See ${pc.cyan('https://github.com/nicholasgasior/atta-dev/blob/main/.atta/docs/ci-review.md')} for suppression workflow`,
  ];
}

function listFrameworkFiles() {
  // Tool-specific (from .claude/)
  const CLAUDE_DIRS = ['agents', 'hooks', 'skills'];
  // Shared (from .atta/)
  const ATTA_DIRS = ['bootstrap', 'team', 'project', 'scripts', 'local', '.metadata'];

  console.log(pc.dim('.claude/ (tool-specific):'));
  for (const dir of CLAUDE_DIRS) {
    const src = join(CLAUDE_ROOT, dir);
    if (!existsSync(src)) continue;
    const count = countFiles(src);
    console.log(`  ${dir}/ (${count} files)`);
  }

  console.log(pc.dim('.atta/ (shared):'));
  for (const dir of ATTA_DIRS) {
    const src = join(ATTA_ROOT, dir);
    if (!existsSync(src)) continue;
    const count = countFiles(src);
    console.log(`  ${dir}/ (${count} files)`);
  }
}

/**
 * Write the Atta gitignore block if not already present.
 * v3.0: Single `.atta/local/` rule replaces per-file gitignore entries.
 * Team-shared files (.atta/team/, .atta/project/) are committed by default.
 * .claude/ is personal — each dev runs init and generates agents for their own role/tool.
 * Adapter memory directories are per-developer (directives, corrections) — not committed.
 * Uses a sentinel comment for idempotency.
 */
function ensureAttaGitignored(targetDir, adapterName) {
  const gitignorePath = join(targetDir, '.gitignore');
  const existing = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';
  const SENTINEL = '# Atta — runtime & personal';

  if (existing.includes(SENTINEL)) {
    // Upgrade path: replace old per-file rules with single .atta/local/ rule
    const OLD_RULES = [
      '.atta/.context/',
      '.atta/.sessions/',
      '.atta/.metadata/generated-manifest.json',
      '.atta/knowledge/developer-profile.md',
      '.atta/knowledge/',
      '.atta/knowledge',
    ];
    let changed = false;
    let hasLocal = existing.includes('.atta/local/');
    const lines = existing.split('\n');
    const updated = lines.map((line) => {
      const trimmed = line.trim();
      if (OLD_RULES.includes(trimmed)) {
        changed = true;
        if (hasLocal) return null; // already have .atta/local/, drop old rule
        hasLocal = true; // first old rule becomes .atta/local/
        return '.atta/local/';
      }
      return line;
    }).filter((line) => line !== null);

    // Append adapter memory path if missing (upgrade from pre-v2.7.1 installs)
    const memoryPath = getAdapterMemoryPath(adapterName);
    if (memoryPath && !existing.includes(memoryPath)) {
      const insertIdx = updated.length > 0 && updated[updated.length - 1] === ''
        ? updated.length - 1
        : updated.length;
      updated.splice(insertIdx, 0, memoryPath);
      changed = true;
    }

    if (changed) writeFileSync(gitignorePath, updated.join('\n'));
    return;
  }

  // Build adapter-specific memory line
  const memoryPath = getAdapterMemoryPath(adapterName);

  const block = [
    '',
    '# Atta — runtime & personal',
    '.atta/local/',
    '.claude/',
    '.claude-plugin/',
    ...(memoryPath ? [memoryPath] : []),
  ].join('\n');
  writeFileSync(gitignorePath, existing.trimEnd() + block + '\n');
}

/**
 * Returns the gitignore path for the adapter's agent memory directory.
 * .claude/ is already fully gitignored, so only non-Claude adapters need an entry.
 * github-action has no agents/memory.
 */
function getAdapterMemoryPath(adapterName) {
  const map = {
    copilot: '.github/atta/agents/memory/',
    codex: '.agents/agents/memory/',
    gemini: '.gemini/agents/memory/',
    cursor: '.cursor/agents/memory/',
  };
  return map[adapterName] || null;
}

/**
 * Migrate pre-v2.7 installation: move shared content from .claude/ to .atta/.
 * Preserves user-generated content (custom patterns, profiles, corrections).
 */
function migrateToAtta(targetDir) {
  const claudeDir = join(targetDir, '.claude');
  const attaDir = join(targetDir, '.atta');

  const SHARED_DIRS = ['knowledge', 'scripts', 'docs', 'bootstrap', '.metadata', '.context', '.sessions'];

  mkdirSync(attaDir, { recursive: true });

  // Phase 1: Copy all directories first (originals preserved until all copies succeed)
  const copied = [];
  for (const dir of SHARED_DIRS) {
    const src = join(claudeDir, dir);
    if (!existsSync(src)) continue;
    const dest = join(attaDir, dir);
    mkdirSync(dest, { recursive: true });
    try {
      cpSync(src, dest, { recursive: true });
      copied.push(dir);
    } catch (err) {
      throw new Error(
        `Migration failed: could not copy ${dir}/ to .atta/ — all originals preserved in .claude/. ${err.message}`
      );
    }
  }

  // Phase 2: Remove originals only after all copies succeeded
  const failedDeletes = [];
  for (const dir of copied) {
    try {
      rmSync(join(claudeDir, dir), { recursive: true });
    } catch {
      failedDeletes.push(dir);
    }
  }
  if (failedDeletes.length > 0) {
    // Non-fatal: data is safely in .atta/, old copies just couldn't be cleaned up
    console.warn(
      `Warning: migration copied successfully but could not remove old directories: ${failedDeletes.join(', ')}. ` +
        'You can safely delete them from .claude/ manually.'
    );
  }
}

/**
 * Migrate v2.x → v3.0 layout: .atta/knowledge/ → .atta/team/ + .atta/local/.
 * - knowledge/developer-profile.md → local/developer-profile.md (personal, gitignored)
 * - knowledge/* (everything else) → team/* (committed, team-shared)
 * - .context/ → local/context/
 * - .sessions/ → local/sessions/
 * Note: .metadata/generated-manifest.json stays in .metadata/ (referenced by multiple consumers).
 * Preserves user customizations — copies then removes originals.
 */
function migrateToV3(targetDir) {
  const attaDir = join(targetDir, '.atta');
  const knowledgeDir = join(attaDir, 'knowledge');
  const teamDir = join(attaDir, 'team');
  const localDir = join(attaDir, 'local');

  mkdirSync(teamDir, { recursive: true });
  mkdirSync(localDir, { recursive: true });

  // Move developer-profile.md to local/ (personal, gitignored)
  // Guard: don't overwrite an existing v3 profile with the older v2 version
  const profileSrc = join(knowledgeDir, 'developer-profile.md');
  const profileDest = join(localDir, 'developer-profile.md');
  if (existsSync(profileSrc)) {
    if (!existsSync(profileDest)) {
      cpSync(profileSrc, profileDest);
    }
    rmSync(profileSrc);
  }

  // Move everything else in knowledge/ to team/
  // If dest already exists (partial migration), skip the copy but still clean up source
  if (existsSync(knowledgeDir)) {
    for (const entry of readdirSync(knowledgeDir, { withFileTypes: true })) {
      const src = join(knowledgeDir, entry.name);
      const dest = join(teamDir, entry.name);
      if (!existsSync(dest)) {
        cpSync(src, dest, { recursive: true });
      }
      // Only remove source after successful copy or if dest already had the content
      rmSync(src, { recursive: true });
    }
    // Remove empty knowledge/ dir
    try { rmSync(knowledgeDir, { recursive: true }); } catch { /* may not be empty */ }
  }

  // Move .context/ → local/context/
  const contextDir = join(attaDir, '.context');
  if (existsSync(contextDir)) {
    const destContext = join(localDir, 'context');
    mkdirSync(destContext, { recursive: true });
    cpSync(contextDir, destContext, { recursive: true });
    rmSync(contextDir, { recursive: true });
  }

  // Move .sessions/ → local/sessions/
  const sessionsDir = join(attaDir, '.sessions');
  if (existsSync(sessionsDir)) {
    const destSessions = join(localDir, 'sessions');
    mkdirSync(destSessions, { recursive: true });
    cpSync(sessionsDir, destSessions, { recursive: true });
    rmSync(sessionsDir, { recursive: true });
  }

  // Note: .metadata/generated-manifest.json stays in .metadata/ — it's referenced by
  // generate-context.sh, /atta skill, /atta-update skill, and generator.md. Not moved.

  console.log(pc.dim('  Migrated .atta/ to v3.0 layout (team/ + local/)'));
}
