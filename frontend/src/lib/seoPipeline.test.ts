import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const run = (script: string, args: string[]) =>
  execFileSync(process.execPath, [path.join(repoRoot, 'scripts', script), ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

describe('sitemap + prerender pipeline', () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'findmedi-seo-'));

  it('writes a sitemap with locale alternates for every url', () => {
    const dataPath = path.join(tmp, 'data.json');
    writeFileSync(dataPath, JSON.stringify({
      listings: [{ loc: '/hospitals?city=bhopal', count: 12 }],
      details: [{ loc: '/clinic-doctors/abc123' }],
    }));
    const out = path.join(tmp, 'sitemap.xml');

    run('generate-sitemap.mjs', ['--base', 'https://findmedi.in', '--data', dataPath, '--out', out]);
    const xml = readFileSync(out, 'utf8');

    expect(xml).toContain('<loc>https://findmedi.in/</loc>');
    expect(xml).toContain('<loc>https://findmedi.in/clinic-doctors/abc123</loc>');
    expect(xml).toContain('hreflang="en"');
    expect(xml).toContain('hreflang="hi"');
    expect(xml).toContain('hreflang="x-default"');
    expect(xml).toContain('https://findmedi.in/clinic-doctors/abc123?lang=hi');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  it('skips thin listing pages below the provider threshold', () => {
    const dataPath = path.join(tmp, 'thin.json');
    writeFileSync(dataPath, JSON.stringify({
      listings: [{ loc: '/hospitals?city=nowhere', count: 1 }],
      details: [],
    }));
    const out = path.join(tmp, 'thin.xml');
    const stdout = run('generate-sitemap.mjs', ['--base', 'https://findmedi.in', '--data', dataPath, '--out', out]);

    expect(stdout).toContain('thin listings skipped');
    expect(readFileSync(out, 'utf8')).not.toContain('city=nowhere');
  });

  it('prerenders one head per route with the canonical and the alternates', () => {
    const dist = path.join(tmp, 'dist');
    mkdirSync(dist, { recursive: true });
    writeFileSync(path.join(dist, 'index.html'), [
      '<!doctype html>',
      '<html lang="en">',
      '  <head>',
      '    <title>FindMedi</title>',
      '    <meta name="description" content="root" />',
      '    <link rel="canonical" href="https://findmedi.in/" />',
      '  </head>',
      '  <body><div id="root"></div></body>',
      '</html>',
    ].join('\n'));

    const dataPath = path.join(tmp, 'data2.json');
    writeFileSync(dataPath, JSON.stringify({ listings: [], details: [{ loc: '/clinic-doctors/abc123' }] }));

    run('prerender-routes.mjs', ['--dist', dist, '--base', 'https://findmedi.in', '--data', dataPath]);

    const about = readFileSync(path.join(dist, 'about', 'index.html'), 'utf8');
    expect(about).toContain('<link rel="canonical" href="https://findmedi.in/about" />');
    expect(about).toContain('hreflang="hi"');
    expect(about).toContain('https://findmedi.in/about?lang=hi');
    expect(about).not.toContain('href="https://findmedi.in/" />');

    const doctor = readFileSync(path.join(dist, 'clinic-doctors', 'abc123', 'index.html'), 'utf8');
    expect(doctor).toContain('<link rel="canonical" href="https://findmedi.in/clinic-doctors/abc123" />');
    expect(existsSync(path.join(dist, 'clinic-doctors', 'abc123', 'index.html'))).toBe(true);
  });

  it('is idempotent: a second run does not stack the alternates', () => {
    const dist = path.join(tmp, 'dist');
    const dataPath = path.join(tmp, 'data2.json');
    run('prerender-routes.mjs', ['--dist', dist, '--base', 'https://findmedi.in', '--data', dataPath]);
    const about = readFileSync(path.join(dist, 'about', 'index.html'), 'utf8');
    const canonicalCount = (about.match(/rel="canonical"/g) || []).length;
    const alternateCount = (about.match(/rel="alternate"/g) || []).length;
    expect(canonicalCount).toBe(1);
    expect(alternateCount).toBe(3);
  });
});
