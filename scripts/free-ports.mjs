#!/usr/bin/env node
/**
 * Frees the FindMedi dev ports (backend API + Vite) before `npm run dev` starts.
 *
 * Why this exists
 * ---------------
 * When a previous `npm run dev` is closed abruptly (closing the terminal window,
 * killing the parent shell, VS Code reload, ...) the child node processes survive
 * as orphans and keep holding 5001 / 5173. The next `npm run dev` then:
 *   - crashes the backend with `Error: listen EADDRINUSE: address already in use :::5001`
 *   - silently moves Vite to 5174 (because 5173 is taken)
 *
 * Safety
 * ------
 * Only NODE processes whose command line points at THIS project folder are killed,
 * so an unrelated application listening on the same port is never touched.
 *
 * Usage: node scripts/free-ports.mjs   (or `npm run free-ports`)
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const ports = [Number(process.env.BACKEND_PORT || 5001), Number(process.env.FRONTEND_PORT || 5173)];
const dryRun = process.argv.includes('--dry-run');

/** Normalised project path used to verify a process really belongs to this repo. */
const projectNeedle = projectRoot.replace(/\\/g, '/').toLowerCase();

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

/**
 * pid -> { ppid, cmd } for every process on the machine (one PowerShell call).
 *
 * The dev children use *relative* command lines (`node src/index.js`,
 * `vite.js`), so a listener alone cannot be identified as ours. We therefore
 * also look at its ancestors (watcher -> npm -> concurrently), which do contain
 * the absolute project path.
 */
function processTable() {
  const table = new Map();
  if (!isWindows) return table;

  const raw = run('powershell', [
    '-NoProfile',
    '-Command',
    'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress',
  ]).trim();
  if (!raw) return table;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return table;
  }

  for (const row of Array.isArray(parsed) ? parsed : [parsed]) {
    if (!row?.ProcessId) continue;
    table.set(Number(row.ProcessId), {
      ppid: Number(row.ParentProcessId) || 0,
      cmd: String(row.CommandLine || ''),
    });
  }
  return table;
}

/** True when the process itself or any of its ancestors lives inside this project. */
function belongsToProject(pid, table) {
  let current = pid;
  for (let depth = 0; depth < 6 && current > 0; depth += 1) {
    const row = table.get(current);
    if (!row) return false;
    if (row.cmd.replace(/\\/g, '/').toLowerCase().includes(projectNeedle)) return true;
    current = row.ppid;
  }
  return false;
}

/** PIDs currently LISTENING on the given port. */
function listenersOn(port) {
  if (isWindows) {
    const out = run('netstat', ['-ano', '-p', 'tcp']);
    return [
      ...new Set(
        out
          .split(/\r?\n/)
          .filter((l) => l.includes('LISTENING') && new RegExp(`[:.]${port}\\s`).test(l))
          .map((l) => Number(l.trim().split(/\s+/).pop()))
          .filter((pid) => Number.isInteger(pid) && pid > 0)
      ),
    ];
  }
  const out = run('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN']);
  return [...new Set(out.split(/\s+/).map(Number).filter((pid) => Number.isInteger(pid) && pid > 0))];
}

/** Command line of the given PID (empty string when it cannot be read). */
function commandLineOf(pid) {
  if (isWindows) {
    const out = run('powershell', [
      '-NoProfile',
      '-Command',
      `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`,
    ]);
    return out.trim();
  }
  return run('ps', ['-p', String(pid), '-o', 'command=']).trim();
}

function kill(pid) {
  if (isWindows) run('taskkill', ['/F', '/PID', String(pid)]);
  else run('kill', ['-9', String(pid)]);
}

let freed = 0;
const table = processTable();

for (const port of ports) {
  const pids = listenersOn(port);

  if (pids.length === 0) {
    console.log(`✓ port ${port} is free`);
    continue;
  }

  for (const pid of pids) {
    // Windows: walk the ancestor chain (dev children use relative command lines,
    // so the listener itself does not contain the project path).
    // Unix: ps/lsof command line check.
    const isProjectNode = isWindows
      ? belongsToProject(pid, table)
      : commandLineOf(pid).replace(/\\/g, '/').toLowerCase().includes(projectNeedle);

    if (!isProjectNode) {
      console.warn(`! port ${port} is held by PID ${pid}, which does not belong to this project — leaving it alone`);
      continue;
    }

    if (dryRun) {
      console.log(`… would free port ${port} (PID ${pid})`);
      freed += 1;
      continue;
    }

    kill(pid);
    console.log(`✗ killed stale dev process on port ${port} (PID ${pid})`);
    freed += 1;
  }
}

console.log(
  freed > 0
    ? `\nCleaned up ${freed} stale process(es). Starting dev servers on ports ${ports.join(' & ')} ...\n`
    : '\nAll dev ports are ready.\n'
);
