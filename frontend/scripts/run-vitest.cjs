/**
 * Cross-platform launcher for the Vitest CLI.
 *
 * WHY THIS EXISTS
 * ---------------
 * On Windows, Vite builds its module URLs from the working directory and from
 * the path it was started with, verbatim, while Node's ESM loader canonicalises
 * the same files against their real path on disk. When those disagree only in
 * drive-letter case (this repo is checked out at `D:\projects\Findmedi\...` but
 * VS Code / the integrated terminal opens it as `d:\projects\Findmedi\...`), the
 * very same file ends up with two different module URLs. Vite's module runner
 * then evaluates `@vitest/runner` twice, so the copy that receives the test file
 * never has its internal `runner` set and EVERY test file dies at its first
 * `describe(...)` with:
 *
 *   TypeError: Cannot read properties of undefined (reading 'config')
 *
 * That error looks like broken tests but is purely a path-casing issue: the same
 * suite passes when the shell, the working directory and the Vitest entry path
 * all use the on-disk drive case. This wrapper normalises all of them, then
 * spawns Vitest, so `npm test` behaves identically on every platform. It is a
 * no-op on Linux/macOS (where CI runs) and whenever the case already matches, so
 * it cannot regress CI.
 *
 * Usage (see package.json scripts):
 *   node scripts/run-vitest.cjs run
 *   node scripts/run-vitest.cjs            # watch mode
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

/**
 * Uppercases the drive letter on Windows so a path matches its on-disk form.
 * @param {string} target
 * @returns {string}
 */
function normaliseDriveCase(target) {
  if (process.platform !== 'win32') return target;
  return target.replace(/^[a-z]:/, (letter) => letter.toUpperCase());
}

const resolvedRoot = path.resolve(__dirname, '..');
const projectRoot = normaliseDriveCase(resolvedRoot);
const vitestBin = path.join(projectRoot, 'node_modules', 'vitest', 'vitest.mjs');

if (projectRoot !== resolvedRoot) {
  console.log(`[run-vitest] normalised root: ${resolvedRoot} -> ${projectRoot}`);
}

const child = spawn(process.execPath, [vitestBin, ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error('[run-vitest] failed to start Vitest:', error.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});