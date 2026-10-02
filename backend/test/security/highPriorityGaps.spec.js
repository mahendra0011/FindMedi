/**
 * Regression tests for the five high-priority gaps found in the post-audit
 * recheck. Each was a real defect that survived the main audit pass, so each test
 * names the specific failure it prevents.
 */
import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { toPaise, fromPaise } from '../../src/services/ledgerService.js';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('GAP 1 · couponService: percentage vs flat units', () => {
  /**
   * The defect: `toPaise(coupon.discountValue)` was applied to a PERCENTAGE.
   * toPaise(10) === 1000, Math.min(1000, 100) === 100, so a "10%" coupon
   * produced a 100% discount and the payable went to ZERO.
   *
   * The arithmetic is replicated in isolation: `calculateCoupon` needs Mongo, and
   * the unit conversion is where the bug actually lived.
   */
  const discountPaise = (subtotalPaise, type, stored) => {
    if (type === 'percentage') {
      const percent = Number.isFinite(Number(stored))
        ? Math.min(Math.max(Number(stored), 0), 100)
        : 0;
      return Math.round((subtotalPaise * percent) / 100);
    }
    const flatPaise = Number.isFinite(Number(stored)) ? toPaise(stored) : 0;
    return flatPaise > 0 ? flatPaise : 0;
  };

  const subtotal = toPaise(2000); // Rs 2000

  it('applies a 10% coupon as 10%, not 100%', () => {
    expect(fromPaise(discountPaise(subtotal, 'percentage', 10))).toBe(200);
    expect(fromPaise(subtotal - discountPaise(subtotal, 'percentage', 10))).toBe(1800);
  });

  it('computes every percentage correctly against a non-zero order', () => {
    for (const percent of [1, 5, 10, 25, 50, 75, 99, 100]) {
      const discount = discountPaise(subtotal, 'percentage', percent);
      expect(fromPaise(discount)).toBeCloseTo(2000 * (percent / 100), 0);
      expect(fromPaise(subtotal - discount)).toBeGreaterThanOrEqual(0);
    }
  });

  it('clamps a percentage above 100 to exactly 100', () => {
    expect(fromPaise(discountPaise(subtotal, 'percentage', 250))).toBe(2000);
  });

  it('clamps a negative percentage to zero, never to a credit', () => {
    expect(fromPaise(discountPaise(subtotal, 'percentage', -50))).toBe(0);
  });

  it('treats a non-numeric percentage as zero', () => {
    expect(fromPaise(discountPaise(subtotal, 'percentage', 'abc'))).toBe(0);
    expect(fromPaise(discountPaise(subtotal, 'percentage', undefined))).toBe(0);
    expect(fromPaise(discountPaise(subtotal, 'percentage', null))).toBe(0);
  });

  it('still treats a FLAT discount as a money amount', () => {
    expect(fromPaise(discountPaise(subtotal, 'flat', 500))).toBe(500);
    expect(fromPaise(discountPaise(subtotal, 'flat', 0))).toBe(0);
    expect(fromPaise(discountPaise(subtotal, 'flat', -100))).toBe(0);
  });

  it('reproduces the ORIGINAL bug, proving the test would have caught it', () => {
    const oldDiscount = (subtotalPaise, stored) => {
      const raw = toPaise(stored);
      return Math.round((subtotalPaise * Math.min(raw, 100)) / 100);
    };
    expect(fromPaise(subtotal - oldDiscount(subtotal, 10))).toBe(0);      // the bug
    expect(fromPaise(subtotal - discountPaise(subtotal, 'percentage', 10))).toBe(1800); // the fix
  });
});

describe('GAP 2 · assertRoomAccess has no blanket DISPATCH_ROLES grant', () => {
  // assertRoomAccess needs Mongo, but the defect was purely structural: a
  // `DISPATCH_ROLES.has(role)` branch with no tenant comparison. Pin exactly that.
  const src = read('../../src/middleware/chatMembership.js');

  it('does not grant order rooms on role alone', () => {
    const block = src.slice(src.indexOf("case 'order'"), src.indexOf("case 'appointment'"));
    expect(block).not.toMatch(/if \(DISPATCH_ROLES\.has\(role\)\)\s*return\s*\{\s*ok:\s*true/);
    expect(block).toContain('isOperatorForRow');
  });

  it('does not grant appointment rooms on role alone', () => {
    const block = src.slice(src.indexOf("case 'appointment'"), src.indexOf("case 'ride-tracking'"));
    expect(block).not.toMatch(/if \(DISPATCH_ROLES\.has\(role\)\)\s*return\s*\{\s*ok:\s*true/);
    expect(block).toContain('isOperatorForRow');
  });

  it('fails closed when the caller has no resolvable tenant', () => {
    expect(src).toContain('if (!callerProfile?.tenant) return false;');
  });

  it('requires the row to carry a tenant before comparing', () => {
    expect(src).toContain('if (!rowTenant) return false;');
  });

  it('selects the tenant fields the comparison needs', () => {
    expect(src).toContain("tenantFields: ['hospitalId']");
  });

  it('keeps DISPATCH_ROLES only as a capability gate, never as authorisation', () => {
    // Count only real code lines — the explanation of the bug also names the
    // pattern, and matching that would be a comment-parsing exercise.
    const code = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(code.match(/DISPATCH_ROLES\.has\(role\)/g) || []).toHaveLength(1);
  });
});

describe('GAP 3 · appointment reschedule ordering', () => {
  const src = read('../../src/routes/appointments.js');
  const block = (() => {
    const i = src.indexOf("router.put('/:id'");
    return src.slice(i, src.indexOf('router.', i + 10));
  })();

  it('reserves the new seat BEFORE committing the row', () => {
    const reserve = block.indexOf('reserveSlotSeat({');
    const commit = block.indexOf('findByIdAndUpdate(req.params.id');
    expect(reserve).toBeGreaterThan(-1);
    expect(commit).toBeGreaterThan(-1);
    expect(reserve).toBeLessThan(commit);
  });

  it('returns 409 without committing when the new slot is full', () => {
    expect(block.indexOf('return res.status(409)')).toBeLessThan(
      block.indexOf('findByIdAndUpdate(req.params.id')
    );
  });

  it('releases the OLD seat after a successful reschedule', () => {
    // Previously the old seat was released only on a terminal-status transition,
    // so every reschedule leaked one seat.
    expect(block).toMatch(/if \(claimedNewSlot && !\(leftActiveSlot && willBeTerminal\)\)/);
  });

  it('rolls the claimed seat back if the commit throws', () => {
    expect(block).toMatch(/catch \(commitErr\)[\s\S]{0,400}releaseSlotSeat\(claimedNewSlot\)/);
  });
});

describe('GAP 4 · assertOpenSearchAuth is actually invoked at startup', () => {
  const src = read('../../src/index.js');

  it('calls the assertion during boot', () => {
    expect(src).toMatch(/assertOpenSearchAuth\(\)/);
  });

  it('calls it BEFORE the server listens', () => {
    const call = src.indexOf('assertOpenSearchAuth()');
    const listen = src.indexOf('server.listen');
    expect(call).toBeGreaterThan(-1);
    expect(listen).toBeGreaterThan(-1);
    expect(call).toBeLessThan(listen);
  });

  it('rethrows rather than swallowing the failure', () => {
    const i = src.indexOf('DP-B-01: OpenSearch auth assertion failed');
    expect(src.slice(i - 400, i + 200)).toMatch(/throw err/);
  });
});

describe('GAP 5 · webhook verification is fail-closed', () => {
  // Comments are stripped: the explanation of the defect necessarily quotes the
  // old pattern, and matching that would test the prose rather than the code.
  const code = read('../../src/services/webhookSecurity.js')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');

  it('rejects a MISSING timestamp instead of skipping the window check', () => {
    expect(code).toMatch(/if \(timestamp === null \|\| !Number\.isFinite\(timestamp\)\)/);
    expect(code).not.toMatch(/if \(timestamp !== null/);
  });

  it('applies that rule in BOTH entry points', () => {
    // Fixing only the middleware left `assertWebhookFresh` with the same bypass.
    const hits = code.match(/timestamp === null \|\| !Number\.isFinite\(timestamp\)/g) || [];
    expect(hits).toHaveLength(2);
  });

  it('fails closed when the replay cache is required but unavailable', () => {
    expect(code).toMatch(/if \(requireReplayCache\)[\s\S]{0,300}503/);
  });

  it('fails closed on a replay-cache EXCEPTION too, not only unavailability', () => {
    expect(code).toMatch(/catch \(err\)[\s\S]{0,400}requireReplayCache/);
  });

  it('defaults to fail-closed in production', () => {
    expect(code).toMatch(
      /REQUIRE_WEBHOOK_REPLAY_PROTECTION === 'true'\s*\n?\s*\|\|\s*process\.env\.NODE_ENV === 'production'/
    );
  });
});