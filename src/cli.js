import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { init } from './commands/init.js';
import { plugin } from './commands/plugin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion() {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
  );
  return pkg.version;
}

export function run(argv) {
  const program = new Command();

  program
    .name('atta')
    .description('Atta — AI Dev Team Agent')
    .version(getVersion(), '-v, --version');

  program
    .command('init')
    .description(
      'Initialize Atta in your project. Detects tech stack and generates tailored agents.'
    )
    .option('-d, --directory <path>', 'Target project directory', '.')
    .option(
      '--adapter <name>',
      'Target tool adapter (claude-code, copilot, codex, gemini, cursor, github-action)'
    )
    .option(
      '--auth-backend <backend>',
      'Claude auth backend for github-action adapter (anthropic, bedrock, vertex, foundry)',
      'anthropic'
    )
    .option(
      '--provider <name>',
      'AI provider for github-action adapter (anthropic, openai, azure, ollama)',
      'anthropic'
    )
    .option('--dry-run', 'Show what would be installed without writing files')
    .option('-y, --yes', 'Skip prompts, use defaults')
    .action(init);

  program
    .command('plugin')
    .description(
      'Generate standalone plugin packages for tool-specific marketplaces.'
    )
    .option(
      '-t, --target <tool>',
      'Target tool (claude-code, copilot, cursor, codex, all)',
      'claude-code'
    )
    .option(
      '-o, --output <dir>',
      'Output directory for plugin packages',
      'dist/plugins'
    )
    .action(plugin);

  program.parse(argv);
}
