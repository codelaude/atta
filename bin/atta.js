#!/usr/bin/env node

/**
 * Atta CLI — AI Dev Team Agent
 * Entry point for `npx atta-dev` commands.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

process.on('unhandledRejection', (reason) => {
  console.error('Fatal: unhandled promise rejection:', reason);
  process.exit(1);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Load CLI from src/
  const cli = await import(join(__dirname, '..', 'src', 'cli.js'));
  cli.run(process.argv);
} catch (err) {
  console.error('Fatal: failed to start Atta CLI:', err.message);
  if (process.env.DEBUG) {
    console.error(err.stack);
  }
  process.exit(1);
}
