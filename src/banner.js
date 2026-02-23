import pc from 'picocolors';

/**
 * Print the Atta ASCII banner to stdout.
 * Called at the start of `npx atta-dev init`.
 */
export function printBanner() {
  const gb = (s) => pc.bold(pc.green(s));

  console.log('');
  console.log(gb('  ▄▀█ ▀█▀ ▀█▀ ▄▀█'));
  console.log(gb('  █▀█  █   █  █▀█'));
  console.log(pc.green('  ━━━━━━━━━━━━━━━━━'));
  console.log('  ' + pc.dim('AI Dev Team Agent'));
  console.log('');
}
