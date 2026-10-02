/**
 * REC-M-02: record versioning.
 *
 * Two things are being tested, and the second is the one that matters more.
 * The first is that an edit appends a snapshot. The second is that the snapshot
 * is PROVABLY unaltered later - which is the whole point of an audit trail, and
 * the thing a plain list of rows cannot give you.
 *
 * The history this replaced was a half-finished attempt wrapped in a `catch {}`
 * that shrugged and carried on, so a missing trail was indistinguishable from a
 * successful edit.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// A chainable thenable, with a REAL sort.
//
// The first version made `sort` a no-op, so `verifyChain` received the fixtures
// in whatever order the test wrote them. That made two tests assert the opposite
// of the truth: one expected a gap that a sorted chain does not have, and one
// expected a reorder to be detected even though the code sorts before checking -
// which is exactly the behaviour that makes a trail stored out of order safe.
// A mock that ignores the call under test is worse than no mock.
const lean = (v) => {
  // `make` closes over the CURRENT value, so every derived object (after a
  // .sort(), say) carries the transformed value through a later .lean().
  // The previous version spread the base object, whose .lean() still closed
  // over the ORIGINAL array - so sorting was silently undone by the next call
  // in the chain.
  const make = (val) => {
    const q = {
      select: () => q,
      sort: () => make(
        Array.isArray(val)
          ? [...val].sort((a, b) => ((a.version || 0) - (b.version || 0)))
          : val
      ),
      limit: () => q,
      lean: () => q,
      then: (r) => Promise.resolve(val).then(r),
    };
    return q;
  };
  return make(v);
};

const { default: RecordVersion, computeVersionHash, diffRecord } =
  await import('../../src/models/RecordVersion.js');

const at = new Date('2026-01-01T00:00:00.000Z');

// The model's OWN statics are spied on rather than the module mocked. The first
// version declared jest.fn()s named findOne/create/find and never wired them to
// anything, so the real mongoose query ran, tried to cast 'r1' to an ObjectId,
// and nine tests failed on a casting error that had nothing to do with the
// behaviour under test.
let findOne, create, find;
beforeEach(() => {
  findOne = jest.spyOn(RecordVersion, 'findOne').mockReturnValue(lean(null));
  create = jest.spyOn(RecordVersion, 'create').mockImplementation(async (d) => d);
  find = jest.spyOn(RecordVersion, 'find').mockReturnValue(lean([]));
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('VERSIONING · the diff names what changed', () => {
  it('reports a changed clinical field', () => {
    const d = diffRecord({ diagnosis: 'flu' }, { diagnosis: 'pneumonia' });
    expect(d).toEqual([{ field: 'diagnosis', from: 'flu', to: 'pneumonia' }]);
  });

  it('reports an ADDED field as a change', () => {
    const d = diffRecord({}, { notes: 'new note' });
    expect(d).toEqual([{ field: 'notes', from: null, to: 'new note' }]);
  });

  it('reports a REMOVED field as a change', () => {
    const d = diffRecord({ notes: 'old' }, {});
    expect(d).toEqual([{ field: 'notes', from: 'old', to: null }]);
  });

  it('ignores bookkeeping fields that carry no clinical meaning', () => {
    // `updatedAt` changes on every save; a trail full of those is unreadable.
    const d = diffRecord(
      { diagnosis: 'flu', updatedAt: 'a', __v: 1, _id: 'x', createdAt: 'c' },
      { diagnosis: 'flu', updatedAt: 'b', __v: 2, _id: 'x', createdAt: 'c' }
    );
    expect(d).toEqual([]);
  });

  it('compares nested objects as a whole, not a partial deep diff', () => {
    // A deep diff that silently drops keys on a shape change is worse than
    // saying "this object changed".
    const d = diffRecord({ vitals: { bp: '120/80', pulse: 70 } }, { vitals: { bp: '130/90' } });
    expect(d).toHaveLength(1);
    expect(d[0].field).toBe('vitals');
  });
});

describe('VERSIONING · each edit appends a hash-chained snapshot', () => {
  it('version 1 has no previous hash', async () => {
    findOne.mockReturnValue(lean(null));
    const v = await RecordVersion.appendVersion({ recordId: 'r1', before: { diagnosis: 'a' }, at });
    expect(v.version).toBe(1);
    expect(v.prevHash).toBe('');
  });

  it('version N+1 chains onto the hash of version N', async () => {
    findOne.mockReturnValue(lean({ version: 4, hash: 'HASH-OF-V4' }));
    const v = await RecordVersion.appendVersion({ recordId: 'r1', before: { diagnosis: 'b' }, at });
    expect(v.version).toBe(5);
    expect(v.prevHash).toBe('HASH-OF-V4');
  });

  it('stores the WHOLE prior document, not just the diff', async () => {
    // A diff is only reconstructible by replaying the chain, so one lost version
    // makes every later one unreadable. Storage is cheap; that risk is not.
    findOne.mockReturnValue(lean(null));
    const before = { diagnosis: 'a', prescription: 'x', vitals: { bp: '120/80' }, notes: 'n' };
    const v = await RecordVersion.appendVersion({ recordId: 'r1', before, at });
    expect(v.snapshot).toEqual(before);
  });

  it('records WHO edited it, not just that it was edited', async () => {
    const v = await RecordVersion.appendVersion({
      recordId: 'r1', before: {}, editedBy: 'doc9', editedByRole: 'doctor',
      editReason: 'corrected laterality', at,
    });
    expect(v.editedBy).toBe('doc9');
    expect(v.editedByRole).toBe('doctor');
    expect(v.editReason).toBe('corrected laterality');
  });
});

describe('VERSIONING · the hash is stable and tamper-evident', () => {
  it('does not depend on key order', () => {
    const a = computeVersionHash('r1', 1, { a: 1, b: 2 }, '', at);
    const b = computeVersionHash('r1', 1, { b: 2, a: 1 }, '', at);
    expect(a).toBe(b);
  });

  it('changes when the content changes', () => {
    const a = computeVersionHash('r1', 1, { diagnosis: 'flu' }, '', at);
    const b = computeVersionHash('r1', 1, { diagnosis: 'pneumonia' }, '', at);
    expect(a).not.toBe(b);
  });

  it('changes when the previous hash changes — that is the chain', () => {
    const a = computeVersionHash('r1', 2, { d: 'x' }, 'H1', at);
    const b = computeVersionHash('r1', 2, { d: 'x' }, 'H2', at);
    expect(a).not.toBe(b);
  });
});

describe('VERSIONING · verifyChain reports WHERE a trail was tampered with', () => {
  const v1 = { recordId: 'r1', version: 1, snapshot: { diagnosis: 'a' }, prevHash: '', createdAt: at };
  v1.hash = computeVersionHash(v1.recordId, 1, v1.snapshot, '', at);
  const v2 = { recordId: 'r1', version: 2, snapshot: { diagnosis: 'b' }, prevHash: v1.hash, createdAt: at };
  v2.hash = computeVersionHash(v2.recordId, 2, v2.snapshot, v1.hash, at);

  it('passes for an intact chain', async () => {
    find.mockReturnValue(lean([v2, v1]));
    const out = await RecordVersion.verifyChain('r1');
    expect(out).toMatchObject({ ok: true, count: 2 });
  });

  it('accepts a record that has never been edited', async () => {
    find.mockReturnValue(lean([]));
    expect(await RecordVersion.verifyChain('r1')).toMatchObject({ ok: true, count: 0 });
  });

  it('detects an ALTERED entry', async () => {
    // The whole point: somebody changed a diagnosis after the fact.
    const tampered = { ...v1, snapshot: { diagnosis: 'TAMPERED' } };
    find.mockReturnValue(lean([v2, tampered]));
    const out = await RecordVersion.verifyChain('r1');
    expect(out.ok).toBe(false);
    expect(out.brokenAt).toBe(1);
  });

  it('detects a REMOVED entry', async () => {
    // Version 1 deleted to hide an edit. The surviving version 2 starts at 2
    // where a chain from 1 would, so the gap is visible.
    find.mockReturnValue(lean([v2]));
    const out = await RecordVersion.verifyChain('r1');
    expect(out).toMatchObject({ ok: false, reason: 'version-gap', brokenAt: 2 });
  });

  it('is unaffected by the order rows come back in', async () => {
    // The chain is verified in VERSION order, not arrival order, so a read that
    // returns rows newest-first - which is how the API serves them - still
    // verifies clean. An earlier version of this test asserted the opposite,
    // which would have meant demanding a failure where the code is correct.
    find.mockReturnValue(lean([v2, v1]));
    expect(await RecordVersion.verifyChain('r1')).toMatchObject({ ok: true, count: 2 });
  });
});
