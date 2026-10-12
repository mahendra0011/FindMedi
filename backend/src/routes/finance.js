import express from 'express';
import ServicePrice from '../models/ServicePrice.js';
import DiscountPolicy from '../models/DiscountPolicy.js';
import CreditNote from '../models/CreditNote.js';
import CashCounter from '../models/CashCounter.js';
import CashShift from '../models/CashShift.js';
import Billing from '../models/Billing.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 09 §9.5: tariff master, discount authority, credit notes, cash
// counter shifts. Price resolution is server-side; clients never send prices.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

// ─── Service prices ─────────────────────────────────────────────────────────
// authz: role (billing:read / billing:write via authorize below)
router.get('/prices', authorize('billing:read'), async (req, res) => {
  try {
    const { category, code } = req.query;
    const filter = { ...tenantFilter(req), active: true };
    if (category) filter.category = category;
    if (code) filter.code = new RegExp(`^${String(code).trim()}$`, 'i');
    const rows = await ServicePrice.find(filter).sort({ code: 1 }).limit(500).lean();
    return res.json({ prices: rows });
  } catch (err) {
    logger.error(`Finance prices error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/prices', authorize('billing:write'), async (req, res) => {
  try {
    const { code, name, deptId, category, hsn, gstRate, prices } = req.body || {};
    if (!code || !name || !Array.isArray(prices) || !prices.length) {
      return res.status(400).json({ message: 'code + name + prices[] required' });
    }
    const row = await ServicePrice.create({
      hospitalId: req.user.hospitalId, code: String(code).toUpperCase(), name,
      deptId: deptId || '', category: category || 'other', hsn: hsn || '',
      gstRate: Number(gstRate) || 0, prices, createdBy: actorId(req),
    });
    await auditLog('price_created', actorId(req), { priceId: row._id, code, ip: req.ip });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Price code already exists' });
    logger.error(`Finance price create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Resolve the applicable price server-side (payerClass + date window).
// authz: role
router.get('/prices/resolve', authorize('billing:read'), async (req, res) => {
  try {
    const { code, payerClass, on } = req.query;
    const row = await ServicePrice.findOne({
      ...tenantFilter(req), code: String(code || '').toUpperCase(), active: true,
    }).lean();
    if (!row) return res.status(404).json({ message: 'Price not found' });
    const at = on ? new Date(on) : new Date();
    const match = (row.prices || []).find((p) =>
      (p.payerClass || 'cash') === (payerClass || 'cash')
      && new Date(p.from).getTime() <= at.getTime()
      && (!p.to || new Date(p.to).getTime() >= at.getTime()));
    if (!match) return res.status(404).json({ message: 'No price for payer class / date' });
    return res.json({ code: row.code, amount: match.amount, gstRate: row.gstRate, hsn: row.hsn });
  } catch (err) {
    logger.error(`Finance resolve error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Discount authority check ───────────────────────────────────────────────
// authz: role — returns whether the caller's role may grant pct% (else who must approve).
router.post('/discounts/check', authorize('billing:read'), async (req, res) => {
  try {
    const pct = Number(req.body?.percent || 0);
    const policy = await DiscountPolicy.findOne({
      ...tenantFilter(req), role: req.user.role, active: true,
    }).lean();
    const max = policy ? policy.maxPercent : 0;
    if (pct <= max) return res.json({ allowed: true, requiresReason: policy ? policy.requiresReason : true });
    return res.json({ allowed: false, approverRole: policy ? policy.approverRole : 'hospital_admin' });
  } catch (err) {
    logger.error(`Finance discount check error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Credit notes ───────────────────────────────────────────────────────────
// authz: role + step-up (money movement with approval).
router.post('/credit-notes', authorize('billing:write'), requireStepUp('refunds:issue'), async (req, res) => {
  try {
    const { billId, kind, amount, reason } = req.body || {};
    if (!billId || !(Number(amount) > 0) || !reason) {
      return res.status(400).json({ message: 'billId + amount>0 + reason required' });
    }
    const bill = await Billing.findById(billId);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    // File 22 P0-1: above-threshold credit notes are HELD (Issued) until an
    // approval is consumed; small ones apply immediately as before.
    const { default: ApprovalPolicy } = await import('../models/ApprovalPolicy.js');
    const { resolveThreshold } = await import('../lib/approvalWiring.js');
    const { safeFirst } = await import('../lib/approvalWiring.js');
    const policy = await safeFirst(ApprovalPolicy.findOne({
      hospitalId: req.user.hospitalId, key: 'credit-note', active: true,
    }).lean());
    const { limit, roles } = resolveThreshold(policy, 'credit-note');
    const needsHold = Number(amount) >= limit;
    let approvalRef = null;
    if (needsHold) {
      const { ensureApproval, approvalError } = await import('./approvals.js');
      try {
        const approval = await ensureApproval({
          req, policyKey: 'credit-note',
          entityRef: { model: 'Billing', id: bill._id },
          title: `Credit note ₹${amount} on bill ${bill.invoiceId}`,
          amount: Number(amount), roles,
        });
        approvalRef = approval._id;
      } catch (e) {
        if (approvalError(res, e)) return undefined;
        throw e;
      }
    }
    const note = await CreditNote.create({
      hospitalId: bill.hospitalId, billId: bill._id, patientId: bill.patientId,
      kind: kind === 'Debit' ? 'Debit' : 'Credit', amount: Number(amount),
      reason: String(reason).slice(0, 500), approvedBy: needsHold ? null : actorId(req),
      status: needsHold ? 'Issued' : 'Applied', appliedAt: needsHold ? null : new Date(),
      createdBy: actorId(req),
    });
    if (!needsHold) {
      const delta = note.kind === 'Credit' ? -note.amount : note.amount;
      bill.balance = Math.max(0, (bill.balance || 0) + delta);
      await bill.save();
    }
    await auditLog('credit_note_issued', actorId(req), { noteId: note._id, billId, amount, held: needsHold, ip: req.ip });
    return res.status(201).json({ id: String(note._id), balance: bill.balance, held: needsHold, approvalRef });
  } catch (err) {
    logger.error(`Finance credit-note error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Apply a HELD credit note once its approval is consumed.
router.post('/credit-notes/:id/apply', authorize('billing:write'), requireStepUp('refunds:issue'), async (req, res) => {
  try {
    const { default: CreditNote } = await import('../models/CreditNote.js');
    const note = await CreditNote.findById(req.params.id);
    if (!note || note.status !== 'Issued') return res.status(404).json({ message: 'Held credit note not found' });
    const { consumeApproval, approvalError } = await import('./approvals.js');
    try {
      await consumeApproval({
        hospitalId: req.user.hospitalId, approvalId: req.body?.approvalId,
        policyKey: 'credit-note', minAmount: note.amount,
        consumedFor: `credit-note:${note._id}`, consumedBy: actorId(req),
      });
    } catch (e) {
      if (approvalError(res, e)) return undefined;
      throw e;
    }
    const bill = await Billing.findById(note.billId);
    if (bill) {
      const delta = note.kind === 'Credit' ? -note.amount : note.amount;
      bill.balance = Math.max(0, (bill.balance || 0) + delta);
      await bill.save();
    }
    note.status = 'Applied';
    note.appliedAt = new Date();
    note.approvedBy = actorId(req);
    await note.save();
    await auditLog('credit_note_applied', actorId(req), { noteId: note._id, ip: req.ip });
    return res.json({ id: String(note._id), status: note.status, balance: bill ? bill.balance : null });
  } catch (err) {
    logger.error(`Finance credit-note apply error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Cash counter shifts ────────────────────────────────────────────────────
router.post('/counters', authorize('billing:write'), async (req, res) => {
  try {
    const { name, location } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name required' });
    const c = await CashCounter.create({ hospitalId: req.user.hospitalId, name, location: location || '', createdBy: actorId(req) });
    return res.status(201).json({ id: String(c._id) });
  } catch (err) {
    logger.error(`Finance counter error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/counters/:id/open', authorize('billing:write'), async (req, res) => {
  try {
    const open = await CashShift.findOne({ counterId: req.params.id, status: 'Open' });
    if (open) return res.status(409).json({ message: 'A shift is already open on this counter' });
    const s = await CashShift.create({
      counterId: req.params.id, hospitalId: req.user.hospitalId, cashierId: actorId(req),
      openingFloat: Number(req.body?.openingFloat) || 0,
    });
    return res.status(201).json({ id: String(s._id), status: s.status });
  } catch (err) {
    logger.error(`Finance open shift error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Expenses (approve → paid posts ledger lines) ───────────────────────────
router.post('/expenses', authorize('billing:write'), async (req, res) => {
  try {
    const { date, category, costCenter, vendorId, amount, tax, mode } = req.body || {};
    if (!category || !(Number(amount) > 0)) {
      return res.status(400).json({ message: 'category + amount>0 required' });
    }
    const { default: Expense } = await import('../models/Expense.js');
    const e = await Expense.create({
      hospitalId: req.user.hospitalId, date: date || new Date(), category,
      costCenter: costCenter || '', vendorId: vendorId || null,
      amount: Number(amount), tax: Number(tax) || 0, mode: mode || 'Cash',
      createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(e._id), status: e.status });
  } catch (err) {
    logger.error(`Finance expense error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/expenses/:id/approve', authorize('billing:write'), requireStepUp('payouts:add'), async (req, res) => {
  try {
    const { default: Expense } = await import('../models/Expense.js');
    const { default: LedgerEntry } = await import('../models/LedgerEntry.js');
    const e = await Expense.findById(req.params.id);
    if (!e || e.status !== 'Pending') return res.status(404).json({ message: 'Pending expense not found' });
    // File 22 P0-1: SoD — the claimant can never approve their own expense.
    const { isSelfApproval } = await import('../lib/approvalWiring.js');
    if (isSelfApproval(e.createdBy, actorId(req))) {
      await auditLog('expense_self_attempt', actorId(req), { expenseId: e._id, ip: req.ip });
      return res.status(403).json({ message: 'Self-approval forbidden: a different approver must approve', code: 'SELF_APPROVAL' });
    }
    // File 22 P0-1: above-threshold expenses need a consumed approval.
    const { default: ApprovalPolicy } = await import('../models/ApprovalPolicy.js');
    const { resolveThreshold, safeFirst } = await import('../lib/approvalWiring.js');
    const policy = await safeFirst(ApprovalPolicy.findOne({
      hospitalId: e.hospitalId, key: 'expense', active: true,
    }).lean());
    const { limit, roles } = resolveThreshold(policy, 'expense');
    if (Number(e.amount) >= limit) {
      const { ensureApproval, approvalError } = await import('./approvals.js');
      try {
        await ensureApproval({
          req, policyKey: 'expense',
          entityRef: { model: 'Expense', id: e._id },
          title: `Expense ₹${e.amount} (${e.category})`, amount: Number(e.amount), roles,
        });
      } catch (err2) {
        if (approvalError(res, err2)) return undefined;
        throw err2;
      }
    }
    e.status = 'Approved';
    e.approvedBy = actorId(req);
    await e.save();
    await LedgerEntry.insertMany([
      { hospitalId: e.hospitalId, accountId: `expense:${e.category}`, debit: e.amount, refModel: 'Expense', refId: e._id, narration: `Expense ${e._id}`, createdBy: actorId(req) },
      { hospitalId: e.hospitalId, accountId: 'cash', credit: e.amount, refModel: 'Expense', refId: e._id, narration: `Expense ${e._id}`, createdBy: actorId(req) },
    ]);
    await auditLog('expense_approved', actorId(req), { expenseId: e._id, amount: e.amount, ip: req.ip });
    return res.json({ id: String(e._id), status: e.status });
  } catch (err) {
    logger.error(`Finance expense approve error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/ledger', authorize('billing:read'), async (req, res) => {
  try {
    const { accountId, from, to } = req.query;
    const { default: LedgerEntry } = await import('../models/LedgerEntry.js');
    const filter = { ...tenantFilter(req) };
    if (accountId) filter.accountId = accountId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const rows = await LedgerEntry.find(filter).sort({ date: -1 }).limit(500).lean();
    const totals = rows.reduce((s, r) => ({ debit: s.debit + (r.debit || 0), credit: s.credit + (r.credit || 0) }), { debit: 0, credit: 0 });
    return res.json({ entries: rows, totals });
  } catch (err) {
    logger.error(`Finance ledger error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 09 §9.5: trial balance by account (debit/credit/balance).
router.get('/trial-balance', authorize('billing:read'), async (req, res) => {
  try {
    const { default: LedgerEntry } = await import('../models/LedgerEntry.js');
    const { from, to } = req.query;
    const match = { ...tenantFilter(req) };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }
    const rows = await LedgerEntry.aggregate([
      { $match: match },
      { $group: { _id: '$accountId', debit: { $sum: '$debit' }, credit: { $sum: '$credit' } } },
      { $sort: { _id: 1 } },
    ]);
    const totals = rows.reduce((s, r) => ({ debit: s.debit + r.debit, credit: s.credit + r.credit }), { debit: 0, credit: 0 });
    return res.json({ accounts: rows, totals, balanced: Math.abs(totals.debit - totals.credit) < 0.01 });
  } catch (err) {
    logger.error(`Finance trial balance error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 09 §9.5: P&L — revenue (Billing.paid) minus approved expenses.
router.get('/pnl', authorize('billing:read'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const range = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(to);
    const { default: Billing } = await import('../models/Billing.js');
    const { default: Expense } = await import('../models/Expense.js');
    const hf = { ...tenantFilter(req) };
    const [rev, exp] = await Promise.all([
      Billing.aggregate([
        { $match: { ...hf, ...(Object.keys(range).length ? { createdAt: range } : {}) } },
        { $group: { _id: '$source', revenue: { $sum: '$paid' }, billed: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { ...hf, status: { $in: ['Approved', 'Paid'] }, ...(Object.keys(range).length ? { date: range } : {}) } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
      ]),
    ]);
    const revenue = rev.reduce((s, r) => s + (r.revenue || 0), 0);
    const expense = exp.reduce((s, r) => s + (r.total || 0), 0);
    return res.json({ revenueBySource: rev, expenseByCategory: exp, revenue, expense, net: +(revenue - expense).toFixed(2) });
  } catch (err) {
    logger.error(`Finance pnl error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/shifts/:id/close', authorize('billing:write'), async (req, res) => {
  try {
    const s = await CashShift.findById(req.params.id);
    if (!s || s.status !== 'Open') return res.status(404).json({ message: 'Open shift not found' });
    const { counted, denominations, depositToBankRef } = req.body || {};
    // expected comes from the billing ledger (cash-mode payments this shift).
    const agg = await Billing.aggregate([
      { $match: { counterId: s.counterId, createdAt: { $gte: s.openedAt } } },
      { $group: { _id: null, total: { $sum: '$paid' } } },
    ]);
    s.expected = (agg[0]?.total || 0) + (s.openingFloat || 0);
    s.counted = Number(counted);
    s.variance = +(s.counted - s.expected).toFixed(2);
    s.denominations = denominations || {};
    s.depositToBankRef = depositToBankRef || '';
    s.closedAt = new Date();
    s.status = 'Closed';
    await s.save();
    await auditLog('cash_shift_closed', actorId(req), {
      shiftId: s._id, expected: s.expected, counted: s.counted, variance: s.variance, ip: req.ip,
    });
    return res.json({ id: String(s._id), expected: s.expected, counted: s.counted, variance: s.variance });
  } catch (err) {
    logger.error(`Finance close shift error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P0-6: doctor payout statements (TDS derived by the model hook).
router.get('/payouts', authorize('billing:read'), async (req, res) => {
  try {
    const { default: PayoutStatement } = await import('../models/PayoutStatement.js');
    const filter = { ...tenantFilter(req) };
    if (req.query.period) filter.period = req.query.period;
    if (req.query.doctorId) filter.doctorId = req.query.doctorId;
    const rows = await PayoutStatement.find(filter).sort({ period: -1 }).limit(300).lean();
    return res.json({ payouts: rows });
  } catch (err) {
    logger.error(`Payouts error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/payouts', authorize('billing:write'), async (req, res) => {
  try {
    const { default: PayoutStatement } = await import('../models/PayoutStatement.js');
    const { doctorId, period, gross, tdsRate, otherDeductions } = req.body || {};
    if (!doctorId || !period || !/^\d{4}-\d{2}$/.test(period) || !(Number(gross) >= 0)) {
      return res.status(400).json({ message: 'doctorId + period YYYY-MM + gross>=0 required' });
    }
    const row = await PayoutStatement.create({
      hospitalId: req.user.hospitalId, doctorId, period,
      gross: Number(gross), tdsRate: Number(tdsRate ?? 10),
      otherDeductions: Number(otherDeductions) || 0, createdBy: actorId(req),
    });
    await auditLog('payout_created', actorId(req), { payoutId: row._id, ip: req.ip });
    return res.status(201).json({ id: String(row._id), gross: row.gross, tds: row.tds, net: row.net });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Payout already exists for doctor+period' });
    logger.error(`Payout create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/payouts/:id/state', authorize('billing:write'), requireStepUp('payouts:add'), async (req, res) => {
  try {
    const { default: PayoutStatement } = await import('../models/PayoutStatement.js');
    const { state } = req.body || {};
    if (!['Approved', 'Paid'].includes(state)) return res.status(400).json({ message: 'state must be Approved|Paid' });
    const row = await PayoutStatement.findById(req.params.id);
    if (!row || (state === 'Approved' && row.status !== 'Draft') || (state === 'Paid' && row.status !== 'Approved')) {
      return res.status(404).json({ message: 'Payout not in a changeable state' });
    }
    const { isSelfApproval } = await import('../lib/approvalWiring.js');
    if (isSelfApproval(row.createdBy, actorId(req))) {
      return res.status(403).json({ message: 'Self-approval forbidden', code: 'SELF_APPROVAL' });
    }
    row.status = state;
    if (state === 'Approved') row.approvedBy = actorId(req);
    if (state === 'Paid') row.paidAt = new Date();
    await row.save();
    await auditLog('payout_state', actorId(req), { payoutId: row._id, state, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status, net: row.net });
  } catch (err) {
    logger.error(`Payout state error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P1-16: chart of accounts (+ seed).
router.get('/accounts', authorize('billing:read'), async (req, res) => {
  try {
    const { default: Account } = await import('../models/Account.js');
    const rows = await Account.find({ ...tenantFilter(req), active: true }).sort({ code: 1 }).limit(500).lean();
    return res.json({ accounts: rows });
  } catch (err) {
    logger.error(`CoA error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/accounts/seed', authorize('billing:write'), async (req, res) => {
  try {
    const { default: Account, COA_SEED } = await import('../models/Account.js');
    let created = 0;
    for (const [code, name, group, gstApplicable] of COA_SEED) {
      // eslint-disable-next-line no-await-in-loop
      const r = await Account.findOneAndUpdate(
        { hospitalId: req.user.hospitalId, code },
        { $setOnInsert: { name, group, gstApplicable, createdBy: actorId(req) } },
        { upsert: true, new: true },
      );
      if (r) created += 1;
    }
    const count = await Account.countDocuments({ ...tenantFilter(req) });
    return res.status(201).json({ accounts: count });
  } catch (err) {
    logger.error(`CoA seed error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P1-16: AP vendor bills (3-way match) + post to ledger.
router.get('/vendor-bills', authorize('billing:read'), async (req, res) => {
  try {
    const { default: VendorBill } = await import('../models/VendorBill.js');
    const rows = await VendorBill.find(tenantFilter(req)).sort({ createdAt: -1 }).limit(300).lean();
    return res.json({ bills: rows });
  } catch (err) {
    logger.error(`Vendor bills error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

function matchBill(lines) {
  let subTotal = 0;
  let gstTotal = 0;
  let status = 'Matched';
  for (const l of lines) {
    const qty = Math.min(Number(l.poQty) || 0, Number(l.grnQty) || 0, Number(l.billQty) || 0);
    if (qty <= 0) { status = 'Unmatched'; continue; }
    if (Number(l.billQty) > Math.min(Number(l.poQty) || 0, Number(l.grnQty) || 0)) status = 'Excess';
    else if (Number(l.billQty) < Math.min(Number(l.poQty) || 0, Number(l.grnQty) || 0)) status = status === 'Matched' ? 'Short' : status;
    const line = qty * (Number(l.rate) || 0);
    subTotal += line;
    gstTotal += line * (Number(l.gstRate) || 0) / 100;
  }
  subTotal = +subTotal.toFixed(2);
  gstTotal = +gstTotal.toFixed(2);
  return { subTotal, gstTotal, grandTotal: +(subTotal + gstTotal).toFixed(2), matchStatus: status };
}

router.post('/vendor-bills', authorize('billing:write'), async (req, res) => {
  try {
    const { default: VendorBill } = await import('../models/VendorBill.js');
    const { supplierId, billNo, billDate, purchaseOrderId, lines } = req.body || {};
    if (!supplierId || !billNo || !Array.isArray(lines) || !lines.length) {
      return res.status(400).json({ message: 'supplierId + billNo + lines[] required' });
    }
    const m = matchBill(lines);
    const row = await VendorBill.create({
      ...tenantFilter(req), supplierId, billNo, billDate: billDate || new Date(),
      purchaseOrderId: purchaseOrderId || null, lines, ...m, createdBy: actorId(req),
    });
    await auditLog('vendor_bill_created', actorId(req), { billId: row._id, match: m.matchStatus, ip: req.ip });
    return res.status(201).json({ id: String(row._id), ...m });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Vendor bill number already booked' });
    logger.error(`Vendor bill error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/vendor-bills/:id/post', authorize('billing:write'), requireStepUp('payouts:add'), async (req, res) => {
  try {
    const { default: VendorBill } = await import('../models/VendorBill.js');
    const { default: LedgerEntry } = await import('../models/LedgerEntry.js');
    const row = await VendorBill.findById(req.params.id);
    if (!row || row.status !== 'Draft') return res.status(404).json({ message: 'Draft vendor bill not found' });
    if (row.matchStatus === 'Unmatched') {
      return res.status(409).json({ message: '3-way match failed — nothing accrues', code: 'MATCH_FAILED' });
    }
    row.status = 'Posted';
    await row.save();
    await LedgerEntry.insertMany([
      { hospitalId: row.hospitalId, accountId: '4100', debit: row.subTotal, refModel: 'VendorBill', refId: row._id, narration: `Vendor bill ${row.billNo}`, createdBy: actorId(req) },
      { hospitalId: row.hospitalId, accountId: '2200', debit: 0, credit: row.gstTotal, refModel: 'VendorBill', refId: row._id, narration: `GST on ${row.billNo}`, createdBy: actorId(req) },
      { hospitalId: row.hospitalId, accountId: '2000', debit: 0, credit: row.grandTotal, refModel: 'VendorBill', refId: row._id, narration: `Payable ${row.billNo}`, createdBy: actorId(req) },
    ]);
    await auditLog('vendor_bill_posted', actorId(req), { billId: row._id, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Vendor bill post error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P1-16: GSTR-1-ish B2B export (billed invoices with GSTIN, one CSV).
router.get('/gstr', authorize('billing:read'), async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'month YYYY-MM required' });
    const rows = await Billing.find({
      ...tenantFilter(req), date: { $gte: `${month}-01`, $lte: `${month}-31` },
      gstin: { $ne: '' },
    }).select('invoiceId date gstin taxableAmount tax amount patient').sort({ date: 1 }).limit(2000).lean();
    const head = 'invoice_no,date,gstin,patient,taxable_value,tax_amount,total';
    const lines = rows.map((b) => [
      b.invoiceId, b.date, b.gstin, JSON.stringify(b.patient || ''),
      b.taxableAmount || 0, b.tax || 0, b.amount || 0,
    ].join(','));
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename="gstr-${month}.csv"`);
    return res.send([head, ...lines].join('\n'));
  } catch (err) {
    logger.error(`GSTR error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P1-16: bank-wise book (ledger lines for an account code).
router.get('/bank-books', authorize('billing:read'), async (req, res) => {
  try {
    const { default: LedgerEntry } = await import('../models/LedgerEntry.js');
    const { accountId, from, to } = req.query;
    const filter = { ...tenantFilter(req) };
    if (accountId) filter.accountId = accountId;
    else filter.accountId = { $in: ['1000', '1010'] };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const rows = await LedgerEntry.find(filter).sort({ date: -1 }).limit(500).lean();
    const debit = rows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
    const credit = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0);
    return res.json({ lines: rows, debit, credit, balance: debit - credit });
  } catch (err) {
    logger.error(`Bank book error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Module #25: Double-Entry Trial Balance & Financial Summary
router.get('/trial-balance', authorize('billing:read', 'admin:read'), async (req, res) => {
  try {
    const { default: LedgerEntry } = await import('../models/LedgerEntry.js');
    const filter = { ...tenantFilter(req) };
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) filter.date.$lte = new Date(req.query.to);
    }

    const rows = await LedgerEntry.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$accountId',
          totalDebit: { $sum: '$debit' },
          totalCredit: { $sum: '$credit' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const accountsMap = {
      '1000': { name: 'Cash in Hand (Counter)', type: 'ASSET' },
      '1010': { name: 'Bank Accounts / Gateways', type: 'ASSET' },
      '1200': { name: 'Patient Accounts Receivable', type: 'ASSET' },
      '1300': { name: 'Pharmacy Inventory Stock', type: 'ASSET' },
      '2100': { name: 'Vendor Accounts Payable', type: 'LIABILITY' },
      '2200': { name: 'Patient Advance Deposits', type: 'LIABILITY' },
      '4000': { name: 'Clinical Consultation Revenue', type: 'REVENUE' },
      '4100': { name: 'IPD Room & Nursing Revenue', type: 'REVENUE' },
      '4200': { name: 'Pharmacy Medicine Sales', type: 'REVENUE' },
      '4300': { name: 'Lab & Diagnostic Revenue', type: 'REVENUE' },
      '5000': { name: 'Doctor Consultation Payouts', type: 'EXPENSE' },
      '5100': { name: 'Medicine Purchases (COGS)', type: 'EXPENSE' },
      '5200': { name: 'Facility & Maintenance Costs', type: 'EXPENSE' },
    };

    let grandDebit = 0;
    let grandCredit = 0;

    const trialBalance = rows.map((r) => {
      const code = String(r._id);
      const accInfo = accountsMap[code] || { name: `General Account ${code}`, type: 'GENERAL' };
      const netDebit = r.totalDebit > r.totalCredit ? r.totalDebit - r.totalCredit : 0;
      const netCredit = r.totalCredit > r.totalDebit ? r.totalCredit - r.totalDebit : 0;
      grandDebit += r.totalDebit;
      grandCredit += r.totalCredit;

      return {
        accountCode: code,
        accountName: accInfo.name,
        accountType: accInfo.type,
        totalDebit: r.totalDebit,
        totalCredit: r.totalCredit,
        closingDebit: netDebit,
        closingCredit: netCredit,
      };
    });

    const isBalanced = Math.abs(grandDebit - grandCredit) < 0.01;

    return res.json({
      trialBalance,
      grandDebit,
      grandCredit,
      isBalanced,
      variance: Math.abs(grandDebit - grandCredit),
    });
  } catch (err) {
    logger.error(`Trial balance error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Module #61 & #62: Bed Category Tariff Multiplier Matrix & Package Inclusions
const BED_CATEGORY_MULTIPLIERS = {
  general: 1.0,
  semi_private: 1.3,
  deluxe_private: 1.8,
  super_deluxe: 2.5,
  icu: 2.0,
};

router.get('/tariffs/calculate', authorize('billing:read'), async (req, res) => {
  try {
    const { serviceCode, bedCategory, basePrice } = req.query;
    const cat = String(bedCategory || 'general').toLowerCase();
    const multiplier = BED_CATEGORY_MULTIPLIERS[cat] || 1.0;
    const base = Number(basePrice) || 1000;
    const calculatedFee = Math.round(base * multiplier);

    return res.json({
      serviceCode: serviceCode || 'GEN-SERVICE',
      bedCategory: cat,
      multiplier,
      baseFee: base,
      calculatedFee,
      ruleApplied: `Standard Bed Multiplier (${multiplier}x) for ${cat.toUpperCase()}`,
    });
  } catch (err) {
    logger.error(`Tariff calculation error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/packages/evaluate-exclusions', authorize('billing:read'), async (req, res) => {
  try {
    const { packageCode, orderedServices } = req.body || {};
    // Example package definitions (fallback when no DB definition exists)
    const PACKAGES = {
      'PKG-MATERNITY-NORMAL': {
        name: 'Normal Delivery Package',
        bundledPrice: 30000,
        includedCodes: ['ROOM-GEN-2D', 'DOC-DELIVERY-FEE', 'NUR-POSTNATAL', 'BABY-FIRST-CHECK'],
        excludedCodes: ['BLOOD-PRBC', 'NICU-STAY', 'STAPLER-IMPLANT'],
      },
      'PKG-CARDIO-ANGIO': {
        name: 'Coronary Angiography Package',
        bundledPrice: 15000,
        includedCodes: ['CATHLAB-RENT', 'DOC-ANGIO-FEE', 'CONTRAST-DYE'],
        excludedCodes: ['STENT-DRUG-ELUTING', 'ICU-VENT-STAY'],
      },
    };

    // Prefer hospital-defined package from DB; fall back to examples/custom.
    let pkg = null;
    try {
      const PackageDefinition = (await import('../models/PackageDefinition.js')).default;
      const row = await PackageDefinition.findOne({
        ...tenantFilter(req),
        code: String(packageCode || ''),
        active: true,
      }).lean();
      if (row) {
        pkg = {
          name: row.name,
          bundledPrice: row.bundledPrice,
          includedCodes: row.includedCodes || [],
          excludedCodes: row.excludedCodes || [],
        };
      }
    } catch { /* model unavailable → fallback */ }

    if (!pkg) {
      pkg = PACKAGES[packageCode] || {
        name: 'Custom Clinical Bundle',
        bundledPrice: 25000,
        includedCodes: ['ROOM-GEN-2D', 'DOC-VISIT'],
        excludedCodes: ['SPECIAL-IMPLANT', 'NICU-STAY'],
      };
    }

    const services = Array.isArray(orderedServices) ? orderedServices : [];
    const bundledItems = [];
    const excludedBillableItems = [];

    for (const s of services) {
      if (pkg.includedCodes.includes(s.code)) {
        bundledItems.push({ ...s, billingStatus: 'INCLUDED_IN_PACKAGE', charge: 0 });
      } else {
        excludedBillableItems.push({ ...s, billingStatus: 'EXCLUDED_BILL_EXTRA', charge: s.price || 500 });
      }
    }

    const additionalExtraTotal = excludedBillableItems.reduce((acc, it) => acc + (it.charge || 0), 0);

    return res.json({
      packageCode,
      packageName: pkg.name,
      baseBundleAmount: pkg.bundledPrice,
      bundledItems,
      excludedBillableItems,
      additionalExtraTotal,
      finalEstimatedTotal: pkg.bundledPrice + additionalExtraTotal,
    });
  } catch (err) {
    logger.error(`Package evaluation error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Module #62: package definition CRUD (drives evaluate-exclusions engine)
router.get('/packages/definitions', authorize('billing:read'), async (req, res) => {
  try {
    const PackageDefinition = (await import('../models/PackageDefinition.js')).default;
    const rows = await PackageDefinition.find(tenantFilter(req)).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ packages: rows });
  } catch (err) {
    logger.error(`Package definitions error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/packages/definitions', authorize('billing:write'), async (req, res) => {
  try {
    const { code, name, bundledPrice, includedCodes, excludedCodes } = req.body || {};
    if (!code || !name || bundledPrice == null) {
      return res.status(400).json({ message: 'code, name, bundledPrice required' });
    }
    const PackageDefinition = (await import('../models/PackageDefinition.js')).default;
    const row = await PackageDefinition.create({
      hospitalId: req.user.hospitalId,
      code: String(code).trim().toUpperCase(),
      name: String(name).trim(),
      bundledPrice: Number(bundledPrice) || 0,
      includedCodes: Array.isArray(includedCodes) ? includedCodes.slice(0, 100) : [],
      excludedCodes: Array.isArray(excludedCodes) ? excludedCodes.slice(0, 100) : [],
      createdBy: req.user._id ?? req.user.id,
    });
    await auditLog('package_definition_created', actorId(req), { packageId: row._id, code: row.code, ip: req.ip });
    return res.status(201).json({ id: String(row._id), code: row.code });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Package code already exists' });
    logger.error(`Package definition create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Tally XML & Zoho CSV Accounting Software Exporters ─────────────────────
router.get('/export/tally-xml', async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const filter = { ...tenantFilter(req) };
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    const bills = await Billing.find(filter).sort({ createdAt: -1 }).limit(1000).lean();

    // Generate Standard Tally XML format (ENVELOPE / TALLYMESSAGE / VOUCHER)
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>Vouchers</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;

    for (const b of bills) {
      const dateStr = (b.createdAt ? new Date(b.createdAt) : new Date()).toISOString().slice(0, 10).replace(/-/g, '');
      const vchNo = b.invoiceId || String(b._id).slice(-8);
      const amount = Number(b.amount || 0).toFixed(2);
      const patientName = (b.patient || 'Cash Patient').replace(/[<>&'"]/g, '');

      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <VOUCHER VCHTYPE="Sales" ACTION="Create">\n`;
      xml += `            <DATE>${dateStr}</DATE>\n`;
      xml += `            <VOUCHERNUMBER>${vchNo}</VOUCHERNUMBER>\n`;
      xml += `            <PARTYLEDGERNAME>${patientName}</PARTYLEDGERNAME>\n`;
      xml += `            <NARRATION>Hospital services invoice ${vchNo}</NARRATION>\n`;
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>${patientName}</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>-${amount}</AMOUNT>\n`;
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>Hospital Healthcare Revenue</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>${amount}</AMOUNT>\n`;
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;
      xml += `          </VOUCHER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    }

    xml += `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', 'attachment; filename=Tally_Hospital_Vouchers.xml');
    return res.send(xml);
  } catch (err) {
    logger.error(`Tally XML export error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/export/zoho-csv', async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const filter = { ...tenantFilter(req) };
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    const bills = await Billing.find(filter).sort({ createdAt: -1 }).limit(1000).lean();

    // Standard Zoho Books Invoice CSV Header
    let csv = 'Invoice Number,Invoice Date,Customer Name,Due Date,Total,Status,Item Name,Item Price\n';
    for (const b of bills) {
      const invNo = `"${(b.invoiceId || String(b._id)).replace(/"/g, '""')}"`;
      const invDate = (b.createdAt ? new Date(b.createdAt) : new Date()).toISOString().slice(0, 10);
      const custName = `"${(b.patient || 'Cash Customer').replace(/"/g, '""')}"`;
      const total = Number(b.amount || 0).toFixed(2);
      const status = b.status || 'Paid';
      const itemName = `"${(b.service || 'Medical Consultation').replace(/"/g, '""')}"`;
      csv += `${invNo},${invDate},${custName},${invDate},${total},${status},${itemName},${total}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=Zoho_Hospital_Invoices.csv');
    return res.send(csv);
  } catch (err) {
    logger.error(`Zoho CSV export error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
