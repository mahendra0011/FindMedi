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

export default router;
