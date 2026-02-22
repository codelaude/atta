import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { init } from './commands/init.js';

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
      'Target tool adapter (claude-code, copilot, codex, gemini)',
      'claude-code'
    )
    .option('--dry-run', 'Show what would be installed without writing files')
    .option('-y, --yes', 'Skip prompts, use defaults')
    .action(init);

  program.parse(argv);
}
