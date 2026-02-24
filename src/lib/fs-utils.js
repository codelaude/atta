import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Read the framework version from .metadata/version.
 * Returns '0.0.0' if the file doesn't exist.
 */
export function readVersion(frameworkRoot) {
  try {
    return readFileSync(
      join(frameworkRoot, '.metadata', 'version'),
      'utf-8'
    ).trim();
  } catch {
    return '0.0.0';
  }
}

/**
 * Recursively count files in a directory.
 */
export function countFiles(dir) {
  let count = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isFile()) {
        count++;
      } else if (entry.isDirectory()) {
        count += countFiles(fullPath);
      }
    }
  } catch {
    // Ignore
  }
  return count;
}
