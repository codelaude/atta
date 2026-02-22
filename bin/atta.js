#!/usr/bin/env node

/**
 * Atta CLI — AI Dev Team Agent
 * Entry point for `npx atta-dev` commands.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load CLI from src/
const cli = await import(join(__dirname, '..', 'src', 'cli.js'));
cli.run(process.argv);
