/**
 * PAY-M-03: payout-vs-settlement reconciliation.
 *
 * Payouts are created by claiming completed `TransactionLedger` rows
 * (`commission.js` POST /payouts), approved four-eyes, then paid — but nothing
 * ever re-derived the numbers afterwards. A crash between `Payout.create()` and
 * the `updateMany` that stamps `payoutId` leaves a payout claiming nothing
 * while its totals say otherwise; a cancelled payout leaves
 * `CommissionConfig.pendingPayout` inflated; revenue can sit unclaimed forever.
 * Each of those is money nobody notices moving wrong until a facility asks why
 * their invoice does not match their bank credit.
 *
 * Four checks, all money-compared to a paisa (moneyRounding normalises at 2dp):
 *
 *   claimed-mismatch  a payout's totals vs the ledger rows actually carrying
 *                     its id (gross / commission / row count)
 *   dangling-claim    a ledger row carries a payoutId that no Payout has
 *                     (deleted/absent payout — the row is claimed by nothing)
 *   unswept-revenue   completed ledger rows older than the grace window with
 *                     `payoutId: null`, grouped by facility ('unattributed'
 *                     when the row never got a facility stamp — the report
 *                     surfaces that rather than hiding it)
 *   pending-drift     `CommissionConfig.pendingPayout` vs the sum of that
 *                     facility's `pending` payouts (cancelled payouts never
 *                     decrement it today)
 *
 * Used two ways: `GET /api/commission/recon` on demand, and daily from
 * `jobs/payoutReconcile.job.js`, which turns `ok: false` into an alert.
 */
import Payout from '../models/Payout.js';
import TransactionLedger from '../models/TransactionLedger.js';
import CommissionConfig from '../models/CommissionConfig.js';

/** moneyRounding writes 2dp — anything under a paisa is not a mismatch. */
const TOLERANCE = 0.01;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function unsweptGraceMs() {
  const days = Number(process.env.PAYOUT_UNSWEPT_GRACE_DAYS);
  const d = Number.isFinite(days) && days >= 0 ? days : 3;
  return d * 24 * 60 * 60 * 1000;
}

/**
 * @param {object} [opts]
 * @param {Date}   [opts.now]
 * @param {number} [opts.payoutWindowDays] how far back payouts are checked
 * @returns {Promise<{ok:boolean, checkedAt:Date, counts:object, totals:object, mismatches:Array}>}
 */
export async function reconcilePayouts({ now = new Date(), payoutWindowDays = 180 } = {}) {
  const payoutSince = new Date(now.getTime() - payoutWindowDays * 24 * 60 * 60 * 1000);
  const unsweptCutoff = new Date(now.getTime() - unsweptGraceMs());
  const mismatches = [];

  const windowPayouts = await Payout.find({ createdAt: { $gte: payoutSince } }).lean();

  // ONE aggregate for every claimed row on the ledger — payout totals are
  // compared against this map, and ids that no window payout explains feed
  // the dangling check below.
  const claimedGroups = await TransactionLedger.aggregate([
    { $match: { payoutId: { $ne: null } } },
    {
      $group: {
        _id: '$payoutId',
        gross: { $sum: '$amount' },
        commission: { $sum: '$commissionAmount' },
        count: { $sum: 1 },
      },
    },
  ]);
  const claimedById = new Map(claimedGroups.map((g) => [String(g._id), g]));

  // 1. claimed rows vs the payout that says it owns them
  for (const p of windowPayouts) {
    const c = claimedById.get(String(p._id));
    const actual = { gross: round2(c?.gross || 0), commission: round2(c?.commission || 0), count: c?.count || 0 };
    const expected = { gross: round2(p.grossRevenue || 0), commission: round2(p.commissionAmount || 0), count: p.transactionCount || 0 };
    const delta = {
      gross: round2(actual.gross - expected.gross),
      commission: round2(actual.commission - expected.commission),
      count: actual.count - expected.count,
    };
    if (Math.abs(delta.gross) > TOLERANCE || Math.abs(delta.commission) > TOLERANCE || delta.count !== 0) {
      mismatches.push({
        type: 'claimed-mismatch',
        payoutId: String(p._id),
        facilityId: p.facilityId ? String(p.facilityId) : null,
        status: p.status,
        expected,
        actual,
        delta,
      });
    }
  }

  // 2. rows carrying a payoutId that no Payout document has
  const windowIds = new Set(windowPayouts.map((p) => String(p._id)));
  const unknownIds = claimedGroups.map((g) => String(g._id)).filter((id) => !windowIds.has(id));
  const existingUnknown = unknownIds.length
    ? await Payout.find({ _id: { $in: unknownIds } }).select('_id').lean()
    : [];
  const existingSet = new Set(existingUnknown.map((p) => String(p._id)));
  for (const id of unknownIds) {
    if (existingSet.has(id)) continue; // an older, out-of-window payout — legitimate
    const g = claimedById.get(id);
    mismatches.push({
      type: 'dangling-claim',
      payoutId: id,
      actual: { gross: round2(g?.gross || 0), commission: round2(g?.commission || 0), count: g?.count || 0 },
      note: 'ledger rows reference a payout that does not exist',
    });
  }

  // 3. settled revenue nobody has claimed, past the grace window
  const unsweptGroups = await TransactionLedger.aggregate([
    { $match: { status: 'completed', payoutId: null, createdAt: { $lt: unsweptCutoff } } },
    {
      $group: {
        _id: '$facilityId',
        gross: { $sum: '$amount' },
        commission: { $sum: '$commissionAmount' },
        count: { $sum: 1 },
      },
    },
  ]);
  let unsweptGross = 0;
  let unsweptRows = 0;
  for (const g of unsweptGroups) {
    const facilityId = g._id == null ? null : String(g._id);
    unsweptGross += round2(g.gross || 0);
    unsweptRows += g.count || 0;
    mismatches.push({
      type: 'unswept-revenue',
      facilityId, // null => 'unattributed': the row never got a facility stamp
      gross: round2(g.gross || 0),
      commission: round2(g.commission || 0),
      count: g.count || 0,
      note: facilityId ? 'completed rows older than grace, never claimed by a payout' : 'completed rows with no facilityId — cannot be paid out as written',
    });
  }

  // 4. config.pendingPayout vs the actual sum of pending payouts
  const [configs, pendingAgg] = await Promise.all([
    CommissionConfig.find({}).lean(),
    Payout.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: '$facilityId', net: { $sum: '$netPayout' }, count: { $sum: 1 } } },
    ]),
  ]);
  const pendingByFacility = new Map(pendingAgg.map((g) => [String(g._id), g]));
  const configByFacility = new Map(configs.map((c) => [String(c.facilityId), c]));

  for (const c of configs) {
    const fid = String(c.facilityId);
    const pending = pendingByFacility.get(fid);
    const expected = round2(pending?.net || 0);
    const actual = round2(c.pendingPayout || 0);
    const delta = round2(actual - expected);
    if (Math.abs(delta) > TOLERANCE) {
      mismatches.push({
        type: 'pending-drift',
        facilityId: fid,
        facilityName: c.facilityName || '',
        expected,
        actual,
        delta,
        pendingCount: pending?.count || 0,
      });
    }
  }
  // facilities with pending payouts but no config at all (drift in the other direction)
  for (const [fid, pending] of pendingByFacility) {
    if (configByFacility.has(fid)) continue;
    mismatches.push({
      type: 'pending-drift',
      facilityId: fid,
      expected: round2(pending.net || 0),
      actual: 0,
      delta: round2(-(pending.net || 0)),
      pendingCount: pending.count || 0,
      note: 'pending payouts exist with no CommissionConfig',
    });
  }

  const counts = {
    payoutsChecked: windowPayouts.length,
    configsChecked: configs.length,
    mismatchCount: mismatches.length,
    byType: mismatches.reduce((acc, m) => { acc[m.type] = (acc[m.type] || 0) + 1; return acc; }, {}),
  };

  return {
    ok: mismatches.length === 0,
    checkedAt: now,
    window: { payoutSince, unsweptCutoff },
    counts,
    totals: { unsweptGross: round2(unsweptGross), unsweptRows },
    mismatches,
  };
}
