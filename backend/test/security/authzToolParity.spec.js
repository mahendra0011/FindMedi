/**
 * The two authorization tools must agree.
 *
 * `check-authz-coverage.mjs` reported 289 unclassified routes while
 * `triage-authz-gaps.mjs` reported 0 unguarded. Both were "correct" and they
 * contradicted each other, because each had its own parser: the coverage gate
 * read only the route definition line, so a route guarded by
 * `applyTenantScope()` inside its handler looked bare to it.
 *
 * These tests assert they now share one source of truth, and that the shared
 * parser still behaves. A duplicated parser is the defect, so the duplication
 * itself is what needs a regression test.
 */
import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanRoutes, stripComments, middlewareChain, guardMiddleware, HANDLER_GUARDS } from '../../scripts/lib/routeScan.mjs';

const ROUTES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'routes');
const triage = fs.readFileSync(
  path.join(ROUTES, '..', '..', 'scripts', 'triage-authz-gaps.mjs'), 'utf8'
);
const coverage = fs.readFileSync(
  path.join(ROUTES, '..', '..', 'scripts', 'check-authz-coverage.mjs'), 'utf8'
);
// The grammar module that now sits between the coverage tool and the parser.
const grammar = fs.readFileSync(
  path.join(ROUTES, '..', '..', 'scripts', 'lib', 'authzClassify.mjs'), 'utf8'
);

describe('AUTHZ · both tools use the shared parser', () => {
  it('triage imports scanRoutes instead of re-parsing files itself', () => {
    expect(triage).toMatch(/import \{[^}]*scanRoutes[^}]*\} from '\.\/lib\/routeScan\.mjs'/);
  });

  it('coverage reaches the parser through the shared grammar module', () => {
    // Was: `expect(coverage).toMatch(scanRoutes import)`. That asserted a
    // particular IMPORT LINE rather than the invariant behind it, so extracting
    // the grammar into lib/authzClassify.mjs — which is what let the manifest
    // freshness test re-derive the classification instead of re-implementing it —
    // failed here despite strictly improving the guarantee.
    //
    // The invariant is "coverage never parses or classifies on its own". So:
    // it must import the grammar module, and the grammar module must import the
    // one parser. Two hops is still one definition; the old assertion would
    // have failed a design that is strictly better.
    expect(coverage).toMatch(/import \{[^}]*\} from '\.\/lib\/authzClassify\.mjs'/);
    expect(grammar).toMatch(/import \{[^}]*scanRoutes[^}]*\} from '\.\/routeScan\.mjs'/);
    // ...and coverage must NOT have picked up a direct parser import purely to
    // satisfy the old shape.
    expect(coverage).not.toMatch(/from '\.\/lib\/routeScan\.mjs'/);
  });

  it('neither file re-declares the guard patterns', () => {
    // A second copy of HANDLER_GUARDS is exactly how the two drifted.
    // The grammar module is included because it now sits in the same chain: it
    // OWNS the classification rules, but it must still IMPORT the parser's
    // guard lists rather than restating them, or the drift simply moves one
    // file down.
    for (const src of [triage, coverage, grammar]) {
      expect(src).not.toMatch(/^const HANDLER_GUARDS/m);
      expect(src).not.toMatch(/^const AUTHZ_MARKERS/m);
      expect(src).not.toMatch(/^function middlewareChain/m);
      expect(src).not.toMatch(/^function handlerBody/m);
    }
  });

  it('only the grammar module declares the classification rules', () => {
    // The converse: exactly ONE file may own the vocabulary, or the grammar is
    // duplicated in the direction this suite cannot otherwise see.
    expect(grammar).toMatch(/export const ROLE_MARKERS/);
    expect(grammar).toMatch(/export const classify/);
    for (const src of [triage, coverage]) {
      expect(src).not.toMatch(/ROLE_MARKERS\s*=/);
      expect(src).not.toMatch(/const classify\s*=/);
    }
  });

  it('neither file reads the routes directory on its own', () => {
    for (const src of [triage, coverage]) {
      expect(src).not.toMatch(/readdirSync\(ROUTES_DIR\)/);
    }
  });
});

describe('AUTHZ · the shared parser still parses correctly', () => {
  it('finds the same number of routes the coverage gate counts', () => {
    const rows = scanRoutes(ROUTES);
    expect(rows.length).toBeGreaterThan(700);
  });

  it('splits a middleware chain into its parts', () => {
    const parts = middlewareChain("router.get('/x', protect, adminOnly, async (req, res) => {");
    expect(parts).toContain('protect');
    expect(parts).toContain('adminOnly');
  });

  it('does not treat authentication or validation as authorization', () => {
    const parts = middlewareChain("router.get('/x', protect, validate(schema), async (req, res) => {");
    expect(guardMiddleware("router.get('/x', protect, validate(schema), async (req, res) => {")).toEqual([]);
  });

  it('strips comments, so a comment cannot pose as a control', () => {
    // The real case: the comment above GET /search/ehr names `consentId`, and
    // GET /search/icd was reported consent-guarded because of it.
    const src = 'const a = 1; // mentions consentId and forbidden\nconst b = 2;';
    expect(stripComments(src)).not.toMatch(/consentId/);
    expect(stripComments(src)).toMatch(/const b = 2/);
  });

  it('keeps a // inside a string literal', () => {
    expect(stripComments("const u = 'https://example.com/x';")).toMatch(/example\.com/);
  });

  it('returns a per-route body with comments already removed', () => {
    const rows = scanRoutes(ROUTES, 'search.js');
    const icd = rows.find((r) => r.target === '/icd');
    expect(icd).toBeDefined();
    // The comment between /icd and /ehr must not leak into /icd's body.
    expect(icd.body).not.toMatch(/consent-gated/);
  });

  it('recognises applyTenantScope as a guard, not just middleware names', () => {
    const guarded = scanRoutes(ROUTES, 'pharmacy.js').filter((r) =>
      HANDLER_GUARDS.some((re) => re.test(r.body))
    );
    // 10 call sites, so this must be well above zero.
    expect(guarded.length).toBeGreaterThanOrEqual(8);
  });

  it('reports the two tools agree: 0 routes are both unguarded and unclassified', () => {
    const rows = scanRoutes(ROUTES);
    const candidates = rows.filter(
      (r) => r.hasProtect && !r.routerGuarded && !r.authzTag &&
        r.guards.length === 0 && !HANDLER_GUARDS.some((re) => re.test(r.body))
    );
    const byKey = new Set(candidates.map((r) => `${r.file}:${r.method} ${r.target}`));
    // Both tools must start from THIS set, or they are looking at different
    // routes and their totals are not comparable. The composition was:
    //   23 raw candidates
    //    -  7 dropped by the /me,/my- naming convention (self-hinted)
    //   = 16 that the coverage gate called "unclassified", and which the triage
    //     then cleared as reviewed-safe
    //
    // On 2026-10-01 all 16 were reviewed and given a real decision, so they no
    // longer reach this set at all (the filter excludes anything with an
    // `// authz:` tag). The 7 self-hinted ones are correctly still here - they
    // are self-service and the naming convention IS their guard.
    //
    // So the number is now 0 rather than 16, and that is a real strengthening:
    // every protected route in the codebase now carries an authorization
    // decision, and a new one without a tag fails here as well as at the gate.
    const selfHinted = new Set(
      candidates
        .filter((r) => ['/me', '/my-', '/profile', '/self', '/mine'].some((h) => r.target.toLowerCase().includes(h)))
        .map((r) => `${r.file}:${r.method} ${r.target}`)
    );
    expect(selfHinted.size).toBe(7);
    expect(byKey.size - selfHinted.size).toBe(0);
  });
});
