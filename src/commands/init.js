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

export async function init(options) {
  const targetDir = resolve(options.directory);
  const dryRun = options.dryRun;
  const authBackend = options.authBackend || 'anthropic';
  const provider = options.provider || 'anthropic';

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

  // Detect pre-v2.8 layout (shared content in .claude/ instead of .atta/)
  const needsMigration = existsSync(join(claudeDir, 'knowledge')) && !existsSync(join(attaDir, 'knowledge'));

  if (isUpdate) {
    if (needsMigration) {
      p.log.warn(
        'Pre-v2.8 installation detected — migrating shared content to .atta/.\n' +
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
    // Migrate pre-v2.8 layout if needed (move shared content from .claude/ to .atta/)
    if (needsMigration) {
      migrateToAtta(targetDir);
    }

    // Run the adapter
    results = adapter.install(CLAUDE_ROOT, ATTA_ROOT, targetDir, { quiet: true, ...adapterOptions });

    // Pre-fill developer profile if we have answers
    if (answers) {
      const profileContent = generateProfile(answers);
      const profileDir = join(attaDir, 'knowledge', 'project');
      mkdirSync(profileDir, { recursive: true });
      const profilePath = join(profileDir, 'developer-profile.md');
      writeFileSync(profilePath + '.tmp', profileContent);
      renameSync(profilePath + '.tmp', profilePath);
      results.files++;

      // Ensure developer-profile.md is gitignored (it's personal, not for the repo)
      ensureGitignored(targetDir, '.atta/knowledge/project/developer-profile.md');
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
      pc.dim('Your preferences were saved to .atta/knowledge/project/developer-profile.md (personal, gitignored)')
    );
    console.log(pc.dim('Team conventions: .atta/knowledge/project/project-profile.md (committed)'));
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
  const ATTA_DIRS = ['bootstrap', 'docs', 'knowledge', 'scripts', '.context', '.metadata'];

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
 * Ensure a path is present in the project's .gitignore.
 * Creates .gitignore if it doesn't exist. No-ops if the entry is already there.
 */
function ensureGitignored(targetDir, entry) {
  const gitignorePath = join(targetDir, '.gitignore');
  const existing = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';
  const lines = existing.split('\n');
  if (lines.some((l) => l.trim() === entry)) return;
  const updated = existing.endsWith('\n') || existing === ''
    ? existing + entry + '\n'
    : existing + '\n' + entry + '\n';
  writeFileSync(gitignorePath, updated);
}

/**
 * Migrate pre-v2.8 installation: move shared content from .claude/ to .atta/.
 * Preserves user-generated content (custom patterns, profiles, corrections).
 */
function migrateToAtta(targetDir) {
  const claudeDir = join(targetDir, '.claude');
  const attaDir = join(targetDir, '.atta');

  const SHARED_DIRS = ['knowledge', 'scripts', 'docs', 'bootstrap', '.metadata', '.context', '.sessions'];

  mkdirSync(attaDir, { recursive: true });

  for (const dir of SHARED_DIRS) {
    const src = join(claudeDir, dir);
    if (!existsSync(src)) continue;
    const dest = join(attaDir, dir);
    mkdirSync(dest, { recursive: true });
    try {
      cpSync(src, dest, { recursive: true });
    } catch (err) {
      throw new Error(`Migration failed: could not copy ${dir}/ to .atta/ — original preserved. ${err.message}`);
    }
    rmSync(src, { recursive: true });
  }
}
