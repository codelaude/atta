import { existsSync, writeFileSync, renameSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { install as installClaude } from '../adapters/claude-code.js';
import { install as installCopilot } from '../adapters/copilot.js';
import { install as installCodex } from '../adapters/codex.js';
import { install as installGemini } from '../adapters/gemini.js';
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
};

export async function init(options) {
  const targetDir = resolve(options.directory);
  const dryRun = options.dryRun;

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
    return runInstall(targetDir, options.adapter || 'claude-code', dryRun, null);
  }

  // Interactive setup — only pass adapter if explicitly provided via --adapter flag
  const answers = await runSetupPrompts({ adapter: options.adapter || null });

  // Run installation with chosen adapter
  await runInstall(targetDir, answers.adapter, dryRun, answers);
}

async function runInstall(targetDir, adapterName, dryRun, answers) {
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
  const needsMigration = existsSync(join(claudeDir, 'knowledge')) && !existsSync(attaDir);

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
    results = adapter.install(CLAUDE_ROOT, ATTA_ROOT, targetDir, { quiet: true });

    // Pre-fill developer profile if we have answers
    if (answers) {
      const profileContent = generateProfile(answers);
      const profileDir = join(attaDir, 'knowledge', 'project');
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
  printWelcome(adapterName, adapter, answers);
}

function printWelcome(adapterName, adapter, answers) {
  const prefix = adapterName === 'codex' ? '$' : '/';
  const agent = adapterName === 'copilot' ? 'atta-agent' : 'agent';
  const review = adapterName === 'copilot' ? 'atta-review' : 'review';

  console.log(pc.bold(pc.green('Setup complete!')));
  console.log('');

  // Quick reference
  console.log(pc.bold('Quick Reference'));
  console.log(pc.dim('─'.repeat(40)));
  console.log(`  ${pc.cyan(`${prefix}atta`)}          Set up agents for your stack`);
  console.log(`  ${pc.cyan(`${prefix}${review}`)}        Code review against conventions`);
  console.log(`  ${pc.cyan(`${prefix}preflight`)}     Full pre-PR validation`);
  console.log(`  ${pc.cyan(`${prefix}${agent} <id>`)}    Invoke any agent directly`);

  if (answers?.includeTutorial !== false) {
    console.log(`  ${pc.cyan(`${prefix}tutorial`)}      5-minute interactive walkthrough`);
  }

  console.log(pc.dim('─'.repeat(40)));

  if (answers) {
    console.log('');
    console.log(
      pc.dim('Your preferences were saved to .atta/knowledge/project/developer-profile.md')
    );
    console.log(pc.dim('Edit it anytime to refine how agents work with you.'));
  }

  console.log('');
  console.log(pc.bold('Next steps:'));
  for (let i = 0; i < adapter.nextSteps.length; i++) {
    console.log(`  ${i + 1}. ${adapter.nextSteps[i]}`);
  }

  console.log('');
  console.log(
    pc.dim('See GETTING-STARTED.md for the full guide.')
  );

  p.outro('Happy coding!');
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
    cpSync(src, dest, { recursive: true });
    rmSync(src, { recursive: true });
  }
}
