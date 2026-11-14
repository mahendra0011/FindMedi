// Serves the built + prerendered frontend the way production does, so the
// crawler check runs against the real html a crawler would receive.
//
// Usage:
//   node scripts/serve-prerendered.mjs --dist frontend/dist --port 4174
//
// Production serving (backend/src/index.js) is `express.static(dist)` plus a
// SPA fallback to dist/index.html. express.static answers a directory with
// its index.html, so a prerendered route (`/about` -> dist/about/index.html)
// is served as its own file; anything without a prerendered head falls back
// to the app shell. This script reproduces exactly that.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const argv = process.argv.slice(2);
const arg = (name, fb) => {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const ix = argv.indexOf(`--${name}`);
  if (ix >= 0 && ix + 1 < argv.length) return argv[ix + 1];
  return fb;
};

const dist = path.resolve(arg('dist', 'frontend/dist'));
const port = Number(arg('port', '4174')) || 4174;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const send = (res, status, file) => {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(status, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
};

http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    pathname = '/';
  }
  // Never let a request escape the dist directory.
  const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const target = path.join(dist, safe);

  if (target.startsWith(dist) && fs.existsSync(target) && fs.statSync(target).isFile()) {
    send(res, 200, target);
    return;
  }
  // Directory with a prerendered head.
  const indexFile = path.join(target, 'index.html');
  if (target.startsWith(dist) && fs.existsSync(indexFile)) {
    send(res, 200, indexFile);
    return;
  }
  // SPA fallback: the app shell (no prerendered head for this route).
  const shell = path.join(dist, 'index.html');
  if (fs.existsSync(shell)) {
    send(res, 200, shell);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
}).listen(port, '127.0.0.1', () => {
  console.log(`serve-prerendered: ${dist} on http://127.0.0.1:${port}`);
});
