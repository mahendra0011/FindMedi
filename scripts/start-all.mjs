#!/usr/bin/env node
/**
 * ONE COMMAND for the whole FindMedi stack:  npm run start:all
 *
 * What it does, in order:
 *   1. preflight  - node version, docker binary, docker engine reachable,
 *                   backend/.env present
 *   2. infra      - `node scripts/infra.mjs up` (mongo, postgres, redis, kafka,
 *                   opensearch, valhalla, livekit, pinot, flink) + health check
 *   3. app        - `npm run dev` = backend :5001 + frontend :5173 (concurrently),
 *                   which itself runs `predev` (scripts/free-ports.mjs) first
 *
 * Ctrl+C stops the app servers. Containers are intentionally LEFT RUNNING
 * (`npm run infra:down` stops them) - a multi-GB re-pull on every restart is
 * not something a dev should pay for by accident.
 *
 * Usage:
 *   npm run start:all                  infra (if docker is up) + backend + frontend
 *   npm run start:all -- --skip-infra  app only (backend + frontend)
 *   npm run start:all -- --check       preflight + docker health, start nothing
 *   npm run start:all -- --dev-legacy  also start the mindsupport server
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

/** Flags parsed out of process.argv (npm passes them through after `--`). */
const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const SKIP_INFRA = hasFlag('--skip-infra');
const CHECK_ONLY = hasFlag('--check');
const DEV_LEGACY = hasFlag('--dev-legacy');
const FORCE_APP = hasFlag('--force-app');

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const say = (msg = '') => console.log(msg);
const step = (n, total, title) => say(`\n${C.bold}${C.cyan}[${n}/${total}] ${title}${C.reset}`);
const ok = (msg) => say(`${C.green}OK${C.reset}  ${msg}`);
const warn = (msg) => say(`${C.yellow}!${C.reset} ${msg}`);
const fail = (msg) => say(`${C.red}FAIL${C.reset} ${msg}`);
const hint = (msg) => say(`${C.dim}  -> ${msg}${C.reset}`);


/** Run a command with a hard timeout; never throws, never hangs the launcher. */
function probe(cmd, cmdArgs, ms) {
  const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8', timeout: ms, windowsHide: true });
  return {
    ok: r.status === 0,
    out: `${r.stdout || ''}${r.stderr || ''}`.trim(),
  };
}

/** True when the docker CLI exists AND the engine answers (daemon actually running). */
function dockerReady() {
  if (!probe('docker', ['--version'], 15000).ok) return { ready: false, why: 'cli' };
  const info = probe('docker', ['info', '--format', '{{.ServerVersion}}'], 20000);
  return info.ok ? { ready: true, version: info.out } : { ready: false, why: 'engine' };
}

function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  if (Number.isInteger(major) && major >= 20) {
    ok(`Node ${process.versions.node}`);
    return true;
  }
  fail(`Node ${process.versions.node} is too old - the repo needs >= 20 (see package.json "engines")`);
  hint('install Node 20+ from https://nodejs.org and reopen the terminal');
  return false;
}

function checkEnvFiles() {
  const backendEnv = path.join(projectRoot, 'backend', '.env');
  const probePath = probe('node', ['-e', `process.stdout.write(String(require('fs').existsSync(${JSON.stringify(backendEnv)})))`], 10000);
  if (probePath.out === 'true') {
    ok('backend/.env present');
    return true;
  }
  fail('backend/.env is missing');
  hint('copy backend/.env.example -> backend/.env and fill in MONGO_URI + JWT_SECRET');
  return false;
}

function reportDockerState() {
  const d = dockerReady();
  if (d.ready) {
    ok(`Docker engine ${d.version}`);
    return true;
  }
  if (d.why === 'cli') {
    fail('Docker CLI not found on PATH');
    hint('install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/');
  } else {
    fail('Docker engine is not responding');
    hint('start Docker Desktop and wait until it reports "Engine running"');
    hint('or skip containers entirely:  npm run start:all -- --skip-infra');
  }
  return false;
}


/** Bring the compose stack up and let infra.mjs print the health table. */
function bringUpInfra() {
  step(2, STEPS, 'Starting infrastructure (docker compose)');
  const r = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', 'infra.mjs'), 'up'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
  });
  // infra.mjs exits 1 while JVM services (pinot/flink) are still booting.
  // That is NOT a reason to block the app from starting - Mongo is what the
  // backend needs first, and it is already up by the time phase 1 returns.
  if (r.status !== 0) {
    warn('some infra services are still booting (JVM services take 1-2 min)');
    hint('re-check any time with:  npm run infra:status');
  } else {
    ok('all infra services healthy');
  }
}

function printBanner() {
  say('');
  say(`${C.bold}FindMedi is starting${C.reset}`);
  say(`${C.dim}  backend   http://localhost:5001/api${C.reset}`);
  say(`${C.dim}  frontend  http://localhost:5173${C.reset}`);
  say(`${C.dim}  API docs  http://localhost:5001/api/docs${C.reset}`);
  say('');
  say(`${C.dim}  Ctrl+C stops the dev servers. Containers keep running -`);
  say(`  stop them with ${C.reset}npm run infra:down${C.dim}.${C.reset}`);
  say('');
}

const STEPS = SKIP_INFRA ? 2 : 3;

function main() {
  say('');
  say(`${C.bold}FindMedi - one command starter${C.reset}`);

  step(1, STEPS, 'Preflight checks');
  let fatal = false;
  if (!checkNode()) fatal = true;
  if (!checkEnvFiles()) fatal = true;

  const dockerUp = reportDockerState();

  if (fatal) {
    say('');
    fail('preflight failed - fix the items above and run the command again');
    process.exit(1);
  }

  if (SKIP_INFRA) {
    hint('--skip-infra: containers left untouched');
  } else if (!dockerUp) {
    if (FORCE_APP) {
      warn('continuing with --force-app: the backend will use whatever MONGO_URI points at');
    } else {
      say('');
      fail('Docker is required to start the full stack');
      hint('app only (no containers):  npm run start:all -- --skip-infra');
      hint('or force it anyway:         npm run start:all -- --force-app');
      process.exit(1);
    }
  }

  if (CHECK_ONLY) {
    say('');
    ok('--check done, nothing was started');
    say('');
    say(`next:  npm run start:all${SKIP_INFRA ? ' -- --skip-infra' : ''}`);
    say('');
    process.exit(0);
  }

  if (!SKIP_INFRA && dockerUp) bringUpInfra();

  step(STEPS, STEPS, 'Starting backend + frontend');
  printBanner();

  const devScript = DEV_LEGACY ? 'dev:legacy' : 'dev';
  const child = spawn(npmCmd, ['run', devScript], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: isWindows,
  });

  // Forward interrupts so Ctrl+C in this window reaches vite + the API watcher
  // instead of leaving them orphaned on ports 5001/5173.
  const stop = () => child.kill(isWindows ? undefined : 'SIGINT');
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  child.on('exit', (code) => process.exit(code ?? 0));
}

try {
  main();
} catch (err) {
  fail(`unexpected launcher error: ${err?.message || err}`);
  process.exit(1);
}
