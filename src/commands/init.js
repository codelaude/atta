import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, rmSync, cpSync } from 'node:fs';
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
      `Run ${pc.cyan('/tutorial')} for a 5-minute interactive walkthrough`,
      `Run ${pc.cyan('/review')} to review your code`,
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
      `Try mentioning ${pc.cyan('$review')} or ${pc.cyan('$preflight')} to activate skills`,
    ],
  },
  gemini: {
    install: installGemini,
    label: 'Gemini CLI',
    nextSteps: [
      `Open your project in Gemini CLI`,
      `Use ${pc.cyan('/review')} or ${pc.cyan('/preflight')} as slash commands`,
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
  const needsMigration = existsSync(join(claudeDir, 'knowledge')) && !existsSync(join(attaDir, 'knowledge'));

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
  try {
    // Migrate pre-v2.7 layout if needed (move shared content from .claude/ to .atta/)
    if (needsMigration) {
      migrateToAtta(targetDir);
    }

    // Run the adapter
    results = adapter.install(CLAUDE_ROOT, ATTA_ROOT, targetDir, { quiet: true, ...adapterOptions });

    // Gitignore runtime & personal content; keep only team-shared files
    ensureAttaGitignored(targetDir, adapterName);

    // Pre-fill developer profile if we have answers
    if (answers) {
      const profileContent = generateProfile(answers);
      const profileDir = join(attaDir, 'knowledge');
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
        join(claudeDir, 'skills', 'tutorial'),               // Claude Code
        join(targetDir, '.github', 'skills', 'tutorial'),     // Copilot
        join(targetDir, '.agents', 'skills', 'tutorial'),     // Codex
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
  printWelcome(adapterName, adapter, answers, adapterOptions);
}

function printWelcome(adapterName, adapter, answers, adapterOptions = {}) {
  console.log(pc.bold(pc.green('Setup complete!')));
  console.log('');

  // Quick reference
  console.log(pc.bold('Quick Reference'));
  console.log(pc.dim('─'.repeat(40)));

  if (adapterName === 'github-action') {
    // GitHub Action: automated CI, no interactive commands
    console.log(`  ${pc.cyan('.github/workflows/atta-review.yml')}   Auto-runs on every PR`);
    console.log(`  ${pc.cyan('.atta/knowledge/ci-suppressions.md')}  False positive management`);
  } else if (adapterName === 'cursor') {
    // Cursor uses @-mention invocation, not slash commands
    console.log(`  ${pc.cyan('atta.mdc')}             Framework context (auto-applied)`);
    console.log(`  ${pc.cyan('@atta-atta')}           Set up agents for your stack`);
    console.log(`  ${pc.cyan('@atta-review')}         Code review against conventions`);
    console.log(`  ${pc.cyan('@atta-preflight')}      Full pre-PR validation`);
    console.log(`  ${pc.cyan('@atta-agent')} <id>     Invoke any agent directly`);
    if (answers?.includeTutorial !== false) {
      console.log(`  ${pc.cyan('@atta-tutorial')}       5-minute interactive walkthrough`);
    }
  } else {
    const prefix = adapterName === 'codex' ? '$' : '/';
    const agent = adapterName === 'copilot' ? 'atta-agent' : 'agent';
    const review = adapterName === 'copilot' ? 'atta-review' : 'review';

    console.log(`  ${pc.cyan(`${prefix}atta`)}          Set up agents for your stack`);
    console.log(`  ${pc.cyan(`${prefix}${review}`)}        Code review against conventions`);
    console.log(`  ${pc.cyan(`${prefix}preflight`)}     Full pre-PR validation`);
    console.log(`  ${pc.cyan(`${prefix}${agent} <id>`)}    Invoke any agent directly`);

    if (answers?.includeTutorial !== false) {
      console.log(`  ${pc.cyan(`${prefix}tutorial`)}      5-minute interactive walkthrough`);
    }
  }

  console.log(pc.dim('─'.repeat(40)));

  if (answers) {
    console.log('');
    console.log(
      pc.dim('Your preferences were saved to .atta/knowledge/developer-profile.md (personal, gitignored)')
    );
    console.log(pc.dim('Team conventions: .atta/project/project-profile.md (committed)'));
    console.log(pc.dim('Runtime content (.context/, .sessions/) is gitignored automatically.'));
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
  const ATTA_DIRS = ['bootstrap', 'knowledge', 'project', 'scripts', '.context', '.metadata'];

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
 * Gitignores runtime/personal content (.context/, .sessions/, personal profile, .claude/).
 * Team-shared files (patterns, suppressions, project/) are committed by default.
 * .claude/ is personal — each dev runs init and generates agents for their own role/tool.
 * Adapter memory directories are per-developer (directives, corrections) — not committed.
 * Uses a sentinel comment for idempotency.
 */
function ensureAttaGitignored(targetDir, adapterName) {
  const gitignorePath = join(targetDir, '.gitignore');
  const existing = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';
  const SENTINEL = '# Atta — runtime & personal';

  if (existing.includes(SENTINEL)) {
    // Upgrade path: old installs had `.atta/knowledge/` which blocks CI suppressions.
    // Line-based: replace first bare rule with specific file, remove any duplicates.
    // Idempotent — safe to run even when developer-profile.md line already exists.
    let hasProfile = existing.includes('.atta/knowledge/developer-profile.md');
    let changed = false;
    const lines = existing.split('\n');
    const updated = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed === '.atta/knowledge/' || trimmed === '.atta/knowledge') {
        changed = true;
        if (hasProfile) return null; // already have specific rule, drop leftover
        hasProfile = true; // first occurrence becomes the specific rule
        return line.replace(/\.atta\/knowledge\/?/, '.atta/knowledge/developer-profile.md');
      }
      return line;
    }).filter((line) => line !== null);

    // Append adapter memory path if missing (upgrade from pre-v2.7.1 installs)
    const memoryPath = getAdapterMemoryPath(adapterName);
    if (memoryPath && !existing.includes(memoryPath)) {
      // Insert before trailing empty string (from split) to preserve file structure
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
    '.atta/.context/',
    '.atta/.sessions/',
    '.atta/.metadata/generated-manifest.json',
    '.atta/knowledge/developer-profile.md',
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
