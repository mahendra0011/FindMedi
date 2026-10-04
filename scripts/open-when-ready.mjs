#!/usr/bin/env node
/**
 * Opens the FindMedi frontend in the default browser as soon as BOTH the API
 * and the Vite dev server actually answer - so a double-click on
 * START-FINDMEDI.bat never lands on a blank page or a "connection refused".
 *
 * Why this exists
 * ---------------
 * `npm run start:all` is synchronous and interactive: it brings up Docker
 * infra (which can take minutes on a cold image pull) and then runs the two
 * dev servers in the foreground. There is no natural moment at which to open
 * the browser, so the launcher runs THIS in a detached background process and
 * then hands the terminal to the dev servers. This script does the waiting.
 *
 * Readiness contract
 * ------------------
 *   API      GET http://localhost:5001/healthz  -> 200 means the Express app
 *            is listening. Chosen over /readyz on purpose: /readyz pings Mongo
 *            and Redis and legitimately returns 503 while the stack is still
 *            warming up, which would make us wait for something that is not
 *            needed to render the first page.
 *   Frontend GET http://localhost:5173/          -> any response (200/404) means
 *            Vite is up. We do NOT require 200: Vite answers 404 for unknown
 *            paths and that still proves the server is serving.
 *
 * Usage:
 *   node scripts/open-when-ready.mjs
 *   node scripts/open-when-ready.mjs --no-open     (poll only, never launch a browser)
 *   node scripts/open-when-ready.mjs --timeout 600 --quiet
 *
 * Env: BACKEND_PORT (5001), FRONTEND_PORT (5173), FINDMEDI_NO_OPEN=1
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

const BACKEND_PORT = Number(process.env.BACKEND_PORT || 5001);
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 5173);

const NO_OPEN = args.includes('--no-open') || process.env.FINDMEDI_NO_OPEN === '1';
const QUIET = args.includes('--quiet');

/** --timeout <seconds>; defaults to 10 min, which covers a cold Docker pull. */
function timeoutSeconds() {
  const i = args.indexOf('--timeout');
  if (i !== -1 && args[i + 1]) {
    const n = Number(args[i + 1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 600;
}

const API_URL = `http://localhost:${BACKEND_PORT}/healthz`;
const WEB_URL = `http://localhost:${FRONTEND_PORT}`;

const C = { reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m', cyan: '\x1b[36m' };
const say = (msg = '') => { if (!QUIET) console.log(msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * True when `url` answers with an HTTP status. Any status counts - we are
 * proving "something is listening", not "the route returned a nice payload".
 * A connection error means "not up yet", which is the common case while the
 * stack boots, so it is swallowed rather than thrown.
 */
async function answers(url, ms = 2000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'manual' });
    return res.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Open `url` in the OS default browser without blocking this process.
 *
 * On Windows we spawn `cmd.exe /c start "" <url>` directly rather than passing
 * `shell: true`. `shell: true` concatenates the arguments into a command string
 * without escaping, which Node now warns about (DEP0190) and which would let a
 * crafted URL run as a command. Spawning cmd.exe explicitly keeps the args in
 * the argv array where they are passed verbatim.
 */
function openBrowser(url) {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'cmd.exe' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
  // `start` treats the first quoted token as the window title, hence the "".
  const cmdArgs = isWin ? ['/c', 'start', '""', url] : [url];
  try {
    const child = spawn(cmd, cmdArgs, {
      cwd: projectRoot,
      stdio: 'ignore',
      detached: true,
      windowsHide: true,
    });
    child.on('error', () => { /* no browser registered - caller already reported */ });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const deadline = Date.now() + timeoutSeconds() * 1000;
  let announced = false;

  while (Date.now() < deadline) {
    const [api, web] = await Promise.all([answers(API_URL), answers(WEB_URL)]);

    if (api && web) {
      if (!announced) {
        say(`${C.green}ready${C.reset}   API ${C.dim}${API_URL}${C.reset} + frontend ${C.dim}${WEB_URL}${C.reset}`);
      }
      if (NO_OPEN) {
        say(`${C.dim}(--no-open) browser not launched${C.reset}`);
      } else if (openBrowser(WEB_URL)) {
        say(`${C.green}opened${C.reset}  ${C.cyan}${WEB_URL}${C.reset}`);
      } else {
        say(`${C.dim}could not launch a browser automatically - open ${WEB_URL} yourself${C.reset}`);
      }
      return;
    }

    if (!announced) {
      announced = true;
      say(`${C.dim}waiting for backend :${BACKEND_PORT} and frontend :${FRONTEND_PORT} ...${C.reset}`);
    }

    await sleep(1000);
  }

  // Timeout is NOT fatal: the dev servers may still be booting (first-run
  // Docker pulls are slow) and the user has the terminal in front of them.
  // Exiting quietly leaves `npm run start:all` fully in control.
  say(`${C.dim}gave up waiting after ${timeoutSeconds()}s - open ${WEB_URL} manually if it is up${C.reset}`);
}

main().catch((err) => {
  if (!QUIET) console.error(`${C.dim}open-when-ready failed: ${err?.message || err}${C.reset}`);
  process.exit(0); // never fail the launcher because the browser helper tripped
});
